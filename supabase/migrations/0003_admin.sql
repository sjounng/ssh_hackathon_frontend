-- 관리자 (기획서 기능 9): 선발, 팀 배정, 팀 관리
-- 참가 신청과 마찬가지로 여러 행을 함께 바꾸는 작업은 함수로 묶고, 서버(service role)만 호출한다.
-- 모든 함수는 첫 인자로 운영진 id를 받아 운영진인지 다시 확인한다.

create or replace function admin_assert(p_admin uuid) returns void language plpgsql as $$
begin
  if not exists (select 1 from users where id = p_admin and role = 'admin') then
    raise exception 'NOT_ADMIN';
  end if;
end $$;

-- ───────────────────────── 선발 ─────────────────────────
-- 승인·거절·결정 취소(submitted로 되돌림). 팀 신청은 같은 팀 팀원 전원을 함께 바꾼다.
-- 제출되지 않은(draft) 신청은 결정할 수 없다. 이미 팀에 배정된 개인 참가자는 승인을 취소할 수 없다
create or replace function admin_decide(p_admin uuid, p_application_ids uuid[], p_status application_status)
returns int language plpgsql as $$
declare
  targets uuid[];
  n int;
begin
  perform admin_assert(p_admin);
  if p_status = 'draft' then raise exception 'INVALID_STATUS'; end if;

  -- 팀 신청이 섞여 있으면 그 팀의 모든 팀원 신청으로 넓힌다
  select array_agg(distinct a2.id) into targets
    from applications a
    join applications a2 on a2.id = a.id or (a.kind = 'team' and a2.team_id = a.team_id)
   where a.id = any(p_application_ids);
  if targets is null then raise exception 'NO_APPLICATION'; end if;

  if exists (select 1 from applications where id = any(targets) and status = 'draft') then
    raise exception 'NOT_SUBMITTED';
  end if;
  if p_status <> 'approved' and exists (
    select 1 from applications a join team_members m on m.user_id = a.user_id join teams t on t.id = m.team_id
     where a.id = any(targets) and a.kind = 'solo' and t.origin = 'assigned'
  ) then
    raise exception 'ALREADY_ASSIGNED';
  end if;

  update applications
     set status = p_status,
         decided_at = case when p_status = 'submitted' then null else now() end,
         decided_by = case when p_status = 'submitted' then null else p_admin end
   where id = any(targets);
  get diagnostics n = row_count;
  return n;
end $$;

-- ───────────────────────── 팀 배정 ─────────────────────────
-- 승인된 개인 참가자로 팀 구성. 인원 조건은 화면에서 경고만 하고 막지는 않는다(운영 판단)
create or replace function admin_create_team(p_admin uuid, p_name text, p_user_ids uuid[], p_leader uuid)
returns teams language plpgsql as $$
declare t teams;
begin
  perform admin_assert(p_admin);
  if coalesce(array_length(p_user_ids, 1), 0) = 0 then raise exception 'NO_MEMBERS'; end if;
  if p_leader is not null and not (p_leader = any(p_user_ids)) then raise exception 'LEADER_NOT_MEMBER'; end if;
  if exists (
    select 1 from unnest(p_user_ids) u(id)
     where not exists (select 1 from applications a where a.user_id = u.id and a.kind = 'solo' and a.status = 'approved')
  ) then
    raise exception 'NOT_APPROVED_SOLO';
  end if;
  if exists (select 1 from team_members where user_id = any(p_user_ids)) then raise exception 'ALREADY_IN_TEAM'; end if;

  insert into teams (name, origin, leader_id) values (nullif(trim(p_name), ''), 'assigned', p_leader) returning * into t;
  insert into team_members (team_id, user_id, role)
  select t.id, a.user_id, a.desired_role from applications a where a.user_id = any(p_user_ids);
  return t;
end $$;

-- 배정 팀에 팀원 추가 (승인된 개인 참가자만)
create or replace function admin_add_member(p_admin uuid, p_team uuid, p_user uuid) returns void language plpgsql as $$
declare t teams;
begin
  perform admin_assert(p_admin);
  select * into t from teams where id = p_team for update;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  if t.origin <> 'assigned' then raise exception 'NOT_ASSIGNED_TEAM'; end if;
  if not exists (select 1 from applications where user_id = p_user and kind = 'solo' and status = 'approved') then
    raise exception 'NOT_APPROVED_SOLO';
  end if;
  if exists (select 1 from team_members where user_id = p_user) then raise exception 'ALREADY_IN_TEAM'; end if;
  insert into team_members (team_id, user_id, role)
  select p_team, p_user, desired_role from applications where user_id = p_user;
end $$;

-- 팀원 제외 (배정 팀). 팀장을 빼면 팀장 자리는 비고, 마지막 한 명을 빼면 팀이 없어진다
create or replace function admin_remove_member(p_admin uuid, p_team uuid, p_user uuid) returns void language plpgsql as $$
declare t teams;
begin
  perform admin_assert(p_admin);
  select * into t from teams where id = p_team for update;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  if t.origin <> 'assigned' then raise exception 'NOT_ASSIGNED_TEAM'; end if;
  delete from team_members where team_id = p_team and user_id = p_user;
  if not found then raise exception 'NOT_IN_TEAM'; end if;
  if t.leader_id = p_user then update teams set leader_id = null where id = p_team; end if;
  if not exists (select 1 from team_members where team_id = p_team) then delete from teams where id = p_team; end if;
end $$;

-- 팀장 지정 (모든 팀)
create or replace function admin_set_leader(p_admin uuid, p_team uuid, p_user uuid) returns void language plpgsql as $$
begin
  perform admin_assert(p_admin);
  if not exists (select 1 from team_members where team_id = p_team and user_id = p_user) then raise exception 'NOT_IN_TEAM'; end if;
  update teams set leader_id = p_user where id = p_team;
end $$;

-- 발표 순서: 넘겨준 순서대로 1, 2, 3… (목록에 없는 팀은 순서 없음)
create or replace function admin_set_presentation_order(p_admin uuid, p_team_ids uuid[]) returns void language plpgsql as $$
begin
  perform admin_assert(p_admin);
  update teams set presentation_order = null where presentation_order is not null;
  update teams t set presentation_order = o.ord
    from unnest(p_team_ids) with ordinality as o(id, ord)
   where t.id = o.id;
end $$;

-- ───────────────────────── 권한 ─────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'admin_assert(uuid)', 'admin_decide(uuid, uuid[], application_status)',
    'admin_create_team(uuid, text, uuid[], uuid)', 'admin_add_member(uuid, uuid, uuid)',
    'admin_remove_member(uuid, uuid, uuid)', 'admin_set_leader(uuid, uuid, uuid)',
    'admin_set_presentation_order(uuid, uuid[])'
  ] loop
    execute format('revoke execute on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke execute on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke execute on function %s from authenticated', f); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
  end loop;
end $$;
