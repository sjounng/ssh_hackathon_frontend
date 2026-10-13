-- 참가 신청 (기획서 기능 3)
-- 여러 테이블을 함께 바꾸는 작업을 함수 하나로 묶어, 중간에 실패하면 전부 되돌리고(트랜잭션)
-- 같은 팀에 동시에 합류할 때 정원을 넘지 않도록 팀 행을 잠근다(for update).
-- 서버(service role)만 호출한다. 실패는 영문 코드로 raise 하고, API에서 한글 안내로 바꾼다.

-- ───────────────────────── 공통 ─────────────────────────
-- 신청 기간 확인. 일정이 비어 있으면 그쪽 제한은 두지 않는다 (운영 전에 관리자 페이지에서 반드시 설정)
create or replace function apply_assert_open() returns void language plpgsql as $$
declare c event_config;
begin
  select * into c from event_config;
  if (c.apply_open_at is not null and now() < c.apply_open_at)
     or (c.apply_close_at is not null and now() > c.apply_close_at) then
    raise exception 'APPLY_CLOSED';
  end if;
end $$;

-- 신청 가능한 사용자인지: 참가자 역할 + 프로필 입력 완료
create or replace function apply_assert_user(p_user uuid) returns void language plpgsql as $$
declare u users;
begin
  select * into u from users where id = p_user;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if u.role <> 'participant' then raise exception 'NOT_PARTICIPANT'; end if;
  if u.profile_completed_at is null then raise exception 'PROFILE_INCOMPLETE'; end if;
end $$;

-- 헷갈리는 글자(0/O, 1/I/L)를 뺀 6자리 참가 코드
create or replace function apply_new_join_code() returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from teams where join_code = code);
  end loop;
  return code;
end $$;

-- 팀 신청·합류 전 확인: 이미 팀에 있거나, 제출했거나 결과가 나온 개인 신청이 있으면 안 된다.
-- 작성 중인 개인 신청은 팀으로 옮겨 가는 것으로 보고 지운다
create or replace function apply_prepare_team_entry(p_user uuid) returns void language plpgsql as $$
declare a applications;
begin
  if exists (select 1 from team_members where user_id = p_user) then raise exception 'ALREADY_IN_TEAM'; end if;
  select * into a from applications where user_id = p_user for update;
  if found then
    if a.kind = 'solo' and a.status = 'draft' then
      delete from applications where id = a.id;
    elsif a.kind = 'solo' then
      raise exception 'HAS_SOLO_APPLICATION';
    else
      raise exception 'ALREADY_IN_TEAM';
    end if;
  end if;
end $$;

-- ───────────────────────── 개인 참가 ─────────────────────────
-- 임시 저장(p_submit=false) 또는 제출(p_submit=true). 제출한 뒤에도 마감 전까지 수정할 수 있다
create or replace function apply_save_solo(p_user uuid, p_role text, p_stack text[], p_motivation text, p_submit boolean)
returns applications language plpgsql as $$
declare
  a applications;
  will_be_submitted boolean;
begin
  perform apply_assert_open();
  perform apply_assert_user(p_user);
  select * into a from applications where user_id = p_user for update;
  if found and a.kind = 'team' then raise exception 'ALREADY_IN_TEAM'; end if;
  if found and a.status in ('approved', 'rejected') then raise exception 'ALREADY_DECIDED'; end if;

  will_be_submitted := p_submit or (found and a.status = 'submitted');
  if will_be_submitted and (coalesce(trim(p_role), '') = '' or coalesce(trim(p_motivation), '') = '') then
    raise exception 'INCOMPLETE';
  end if;

  insert into applications (user_id, kind, desired_role, tech_stack, motivation, status, submitted_at)
  values (p_user, 'solo', trim(p_role), coalesce(p_stack, '{}'), trim(p_motivation),
          case when will_be_submitted then 'submitted'::application_status else 'draft' end,
          case when will_be_submitted then now() end)
  on conflict (user_id) do update set
    desired_role = excluded.desired_role,
    tech_stack   = excluded.tech_stack,
    motivation   = excluded.motivation,
    status       = excluded.status,
    submitted_at = coalesce(applications.submitted_at, excluded.submitted_at)
  returning * into a;
  return a;
end $$;

-- 개인 신청 취소 (결과가 나오기 전, 신청 기간 안)
create or replace function apply_cancel_solo(p_user uuid) returns void language plpgsql as $$
declare a applications;
begin
  perform apply_assert_open();
  select * into a from applications where user_id = p_user and kind = 'solo' for update;
  if not found then raise exception 'NO_APPLICATION'; end if;
  if a.status in ('approved', 'rejected') then raise exception 'ALREADY_DECIDED'; end if;
  delete from applications where id = a.id;
end $$;

-- ───────────────────────── 팀 참가 ─────────────────────────
-- 대표가 팀 만들기: 참가 코드 발급, 대표를 팀원으로 등록
create or replace function apply_create_team(p_user uuid, p_name text) returns teams language plpgsql as $$
declare t teams;
begin
  perform apply_assert_open();
  perform apply_assert_user(p_user);
  if coalesce(trim(p_name), '') = '' or length(trim(p_name)) > 40 then raise exception 'INVALID_TEAM_NAME'; end if;
  perform apply_prepare_team_entry(p_user);

  insert into teams (name, origin, join_code, leader_id)
  values (trim(p_name), 'applied', apply_new_join_code(), p_user)
  returning * into t;
  insert into team_members (team_id, user_id) values (t.id, p_user);
  insert into applications (user_id, kind, team_id) values (p_user, 'team', t.id);
  return t;
end $$;

-- 참가 코드로 합류. 팀 행을 잠가 동시에 여러 명이 합류해도 정원을 넘지 않는다
create or replace function apply_join_team(p_user uuid, p_code text) returns teams language plpgsql as $$
declare
  t teams;
  max_size int;
begin
  perform apply_assert_open();
  perform apply_assert_user(p_user);
  select * into t from teams where join_code = upper(trim(p_code)) and origin = 'applied' for update;
  if not found then raise exception 'CODE_NOT_FOUND'; end if;
  if t.application_submitted_at is not null then raise exception 'TEAM_ALREADY_SUBMITTED'; end if;
  select team_max_size into max_size from event_config;
  if (select count(*) from team_members where team_id = t.id) >= max_size then raise exception 'TEAM_FULL'; end if;
  perform apply_prepare_team_entry(p_user);

  insert into team_members (team_id, user_id) values (t.id, p_user);
  insert into applications (user_id, kind, team_id) values (p_user, 'team', t.id);
  return t;
end $$;

-- 팀원 각자 자기 정보 작성 (팀 안 역할 + 기술 스택 + 한마디). 팀 제출 뒤에도 마감 전까지 수정 가능
create or replace function apply_save_member(p_user uuid, p_role text, p_stack text[], p_motivation text)
returns applications language plpgsql as $$
declare a applications;
begin
  perform apply_assert_open();
  select * into a from applications where user_id = p_user and kind = 'team' for update;
  if not found then raise exception 'NOT_IN_TEAM'; end if;
  if a.status in ('approved', 'rejected') then raise exception 'ALREADY_DECIDED'; end if;
  if a.status = 'submitted' and coalesce(trim(p_role), '') = '' then raise exception 'INCOMPLETE'; end if;

  update team_members set role = nullif(trim(p_role), '') where user_id = p_user;
  update applications
     set desired_role = nullif(trim(p_role), ''), tech_stack = coalesce(p_stack, '{}'), motivation = nullif(trim(p_motivation), '')
   where id = a.id
  returning * into a;
  return a;
end $$;

-- 팀명 변경 (대표, 제출 전)
create or replace function apply_rename_team(p_user uuid, p_name text) returns teams language plpgsql as $$
declare t teams;
begin
  perform apply_assert_open();
  if coalesce(trim(p_name), '') = '' or length(trim(p_name)) > 40 then raise exception 'INVALID_TEAM_NAME'; end if;
  select * into t from teams where leader_id = p_user and origin = 'applied' for update;
  if not found then raise exception 'NOT_LEADER'; end if;
  if t.application_submitted_at is not null then raise exception 'TEAM_ALREADY_SUBMITTED'; end if;
  update teams set name = trim(p_name) where id = t.id returning * into t;
  return t;
end $$;

-- 팀 나가기. 대표는 혼자 남았을 때만 나갈 수 있고, 그러면 팀이 해체된다
create or replace function apply_leave_team(p_user uuid) returns void language plpgsql as $$
declare t teams;
begin
  perform apply_assert_open();
  select teams.* into t from teams join team_members m on m.team_id = teams.id
   where m.user_id = p_user and teams.origin = 'applied' for update of teams;
  if not found then raise exception 'NOT_IN_TEAM'; end if;
  if t.application_submitted_at is not null then raise exception 'TEAM_ALREADY_SUBMITTED'; end if;

  if t.leader_id = p_user then
    if (select count(*) from team_members where team_id = t.id) > 1 then raise exception 'LEADER_HAS_MEMBERS'; end if;
    delete from applications where team_id = t.id;
    delete from teams where id = t.id;
  else
    delete from applications where user_id = p_user and team_id = t.id;
    delete from team_members where user_id = p_user and team_id = t.id;
  end if;
end $$;

-- 대표가 팀 단위로 제출: 인원 조건 충족 + 모든 팀원이 역할 작성
create or replace function apply_submit_team(p_user uuid) returns teams language plpgsql as $$
declare
  t teams;
  c event_config;
  n int;
begin
  perform apply_assert_open();
  select * into t from teams where leader_id = p_user and origin = 'applied' for update;
  if not found then raise exception 'NOT_LEADER'; end if;
  if t.application_submitted_at is not null then raise exception 'TEAM_ALREADY_SUBMITTED'; end if;
  select * into c from event_config;
  select count(*) into n from team_members where team_id = t.id;
  if n < c.team_min_size or n > c.team_max_size then raise exception 'TEAM_SIZE'; end if;
  if exists (select 1 from team_members where team_id = t.id and coalesce(trim(role), '') = '') then
    raise exception 'MEMBER_INCOMPLETE';
  end if;

  update teams set application_submitted_at = now() where id = t.id returning * into t;
  update applications set status = 'submitted', submitted_at = coalesce(submitted_at, now())
   where team_id = t.id and status = 'draft';
  return t;
end $$;

-- 제출 취소 (대표, 결과 전, 신청 기간 안): 팀원 구성을 다시 고칠 수 있게 된다
create or replace function apply_withdraw_team(p_user uuid) returns teams language plpgsql as $$
declare t teams;
begin
  perform apply_assert_open();
  select * into t from teams where leader_id = p_user and origin = 'applied' for update;
  if not found then raise exception 'NOT_LEADER'; end if;
  if t.application_submitted_at is null then raise exception 'TEAM_NOT_SUBMITTED'; end if;
  if exists (select 1 from applications where team_id = t.id and status in ('approved', 'rejected')) then
    raise exception 'ALREADY_DECIDED';
  end if;
  update teams set application_submitted_at = null where id = t.id returning * into t;
  update applications set status = 'draft' where team_id = t.id and status = 'submitted';
  return t;
end $$;

-- ───────────────────────── 권한 ─────────────────────────
-- 함수는 서버(service role)만 호출한다. 공개 키로는 호출할 수 없게 막는다
do $$
declare f text;
begin
  foreach f in array array[
    'apply_assert_open()', 'apply_assert_user(uuid)', 'apply_new_join_code()', 'apply_prepare_team_entry(uuid)',
    'apply_save_solo(uuid, text, text[], text, boolean)', 'apply_cancel_solo(uuid)',
    'apply_create_team(uuid, text)', 'apply_join_team(uuid, text)', 'apply_save_member(uuid, text, text[], text)',
    'apply_rename_team(uuid, text)', 'apply_leave_team(uuid)', 'apply_submit_team(uuid)', 'apply_withdraw_team(uuid)'
  ] loop
    execute format('revoke execute on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke execute on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke execute on function %s from authenticated', f); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
  end loop;
end $$;
