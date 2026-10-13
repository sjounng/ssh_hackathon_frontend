-- 내 팀 · 결과물 제출 (기획서 기능 4 · 5)
-- 0002와 같은 방식: 서버(service role)만 호출하고, 실패는 영문 코드로 raise 해 API에서 한글 안내로 바꾼다.

-- ───────────────────────── 공통 ─────────────────────────
-- 선발된 참가자가 속한 팀. 운영진이 배정한 팀은 팀 배정 발표 시각 전에는 보이지 않는다
create or replace function team_of(p_user uuid, p_lock boolean default false) returns teams language plpgsql as $$
declare
  t teams;
  c event_config;
begin
  if not exists (select 1 from applications where user_id = p_user and status = 'approved') then
    raise exception 'NOT_APPROVED';
  end if;
  if p_lock then
    select teams.* into t from teams join team_members m on m.team_id = teams.id where m.user_id = p_user for update of teams;
  else
    select teams.* into t from teams join team_members m on m.team_id = teams.id where m.user_id = p_user;
  end if;
  if not found then raise exception 'NOT_IN_TEAM'; end if;
  select * into c from event_config;
  if t.origin = 'assigned' and c.team_assign_at is not null and now() < c.team_assign_at then
    raise exception 'NOT_IN_TEAM';
  end if;
  return t;
end $$;

-- 팀 정보(팀명·역할)는 결과물 제출 마감 전까지만 바꿀 수 있다
create or replace function team_assert_editable() returns void language plpgsql as $$
declare c event_config;
begin
  select * into c from event_config;
  if c.submit_deadline_at is not null and now() > c.submit_deadline_at then raise exception 'TEAM_LOCKED'; end if;
end $$;

-- 결과물 제출 기간: 행사 시작 ~ 제출 마감. 일정이 비어 있으면 그쪽 제한은 두지 않는다
create or replace function submission_assert_open() returns void language plpgsql as $$
declare c event_config;
begin
  select * into c from event_config;
  if c.event_start_at is not null and now() < c.event_start_at then raise exception 'SUBMIT_NOT_OPEN'; end if;
  if c.submit_deadline_at is not null and now() > c.submit_deadline_at then raise exception 'SUBMIT_CLOSED'; end if;
end $$;

-- 결과물을 낼 수 있는 사람: 팀장 (팀장이 없는 배정 팀은 운영진이 팀장을 정해야 한다)
create or replace function submission_team(p_user uuid) returns teams language plpgsql as $$
declare t teams;
begin
  t := team_of(p_user, true);
  if t.leader_id is distinct from p_user then raise exception 'NOT_LEADER'; end if;
  perform submission_assert_open();
  return t;
end $$;

-- ───────────────────────── 팀 정보 ─────────────────────────
-- 팀명: 팀장이, 팀장이 없으면 팀원 누구나
create or replace function team_rename(p_user uuid, p_name text) returns teams language plpgsql as $$
declare t teams;
begin
  t := team_of(p_user, true);
  perform team_assert_editable();
  if t.leader_id is not null and t.leader_id <> p_user then raise exception 'NOT_LEADER'; end if;
  if coalesce(trim(p_name), '') = '' or length(trim(p_name)) > 40 then raise exception 'INVALID_TEAM_NAME'; end if;
  update teams set name = trim(p_name) where id = t.id returning * into t;
  return t;
end $$;

-- 팀 안에서 내 역할
create or replace function team_set_role(p_user uuid, p_role text) returns void language plpgsql as $$
declare t teams;
begin
  t := team_of(p_user);
  perform team_assert_editable();
  if coalesce(trim(p_role), '') = '' or length(trim(p_role)) > 40 then raise exception 'INVALID_ROLE'; end if;
  update team_members set role = trim(p_role) where team_id = t.id and user_id = p_user;
end $$;

-- ───────────────────────── 결과물 ─────────────────────────
-- 업로드한 파일 확인: 이 팀 폴더에 실제로 있고, 종류·크기가 맞는지
create or replace function submission_assert_file(p_team uuid, p_path text, p_types text[], p_max bigint) returns void language plpgsql as $$
declare
  meta jsonb;
begin
  if p_path is null then return; end if;
  if p_path not like p_team::text || '/%' or p_path like '%..%' then raise exception 'INVALID_FILE'; end if;
  select metadata into meta from storage.objects where bucket_id = 'submissions' and name = p_path;
  if not found then raise exception 'FILE_NOT_FOUND'; end if;
  if not (meta->>'mimetype' = any (p_types)) then raise exception 'INVALID_FILE'; end if;
  if coalesce((meta->>'size')::bigint, 0) > p_max then raise exception 'FILE_TOO_LARGE'; end if;
end $$;

-- 임시 저장(p_submit=false) 또는 제출(p_submit=true). 제출한 뒤에도 마감 전까지 고칠 수 있다.
-- p: { project_name, tagline, description, cover_image_path, prototype_url, slides_path,
--      github_url, demo_video_url, deploy_url, pledge }
-- 반환: { submission, removed } — removed는 새 파일로 바뀌어 지워도 되는 옛 파일 경로
create or replace function submission_save(p_user uuid, p jsonb, p_submit boolean) returns jsonb language plpgsql as $$
declare
  t teams;
  old submissions;
  s submissions;
  url_re constant text := '^https?://[^[:space:]]+$';
  v_name text := nullif(trim(p->>'project_name'), '');
  v_tagline text := nullif(trim(p->>'tagline'), '');
  v_desc text := nullif(trim(p->>'description'), '');
  v_cover text := nullif(p->>'cover_image_path', '');
  v_proto text := nullif(trim(p->>'prototype_url'), '');
  v_slides text := nullif(p->>'slides_path', '');
  v_github text := nullif(trim(p->>'github_url'), '');
  v_video text := nullif(trim(p->>'demo_video_url'), '');
  v_deploy text := nullif(trim(p->>'deploy_url'), '');
  v_pledge boolean := coalesce((p->>'pledge')::boolean, false);
  will_be_submitted boolean;
  removed text[] := '{}';
begin
  t := submission_team(p_user);
  select * into old from submissions where team_id = t.id for update;

  if v_name is null then raise exception 'PROJECT_NAME_REQUIRED'; end if;
  if length(v_name) > 60 or length(coalesce(v_tagline, '')) > 100 or length(coalesce(v_desc, '')) > 5000 then
    raise exception 'TOO_LONG';
  end if;
  if (v_proto is not null and v_proto !~ url_re) or (v_video is not null and v_video !~ url_re)
     or (v_deploy is not null and v_deploy !~ url_re) then
    raise exception 'INVALID_URL';
  end if;
  if v_github is not null and v_github !~ '^https://(www\.)?github\.com/[^/[:space:]]+/[^/[:space:]]+/?$' then
    raise exception 'INVALID_GITHUB';
  end if;
  perform submission_assert_file(t.id, v_cover, array['image/png', 'image/jpeg', 'image/webp'], 5 * 1024 * 1024);
  perform submission_assert_file(t.id, v_slides, array['application/pdf'], 20 * 1024 * 1024);

  will_be_submitted := p_submit or (old.submitted_at is not null);
  if will_be_submitted and (v_proto is null or v_slides is null or v_github is null) then raise exception 'INCOMPLETE'; end if;
  if will_be_submitted and not v_pledge then raise exception 'PLEDGE_REQUIRED'; end if;

  insert into submissions as x (team_id, project_name, tagline, description, cover_image_path, prototype_url, slides_path,
                                github_url, demo_video_url, deploy_url, pledge_agreed_at, submitted_by, submitted_at)
  values (t.id, v_name, v_tagline, v_desc, v_cover, v_proto, v_slides, v_github, v_video, v_deploy,
          case when v_pledge then now() end, p_user, case when will_be_submitted then now() end)
  on conflict (team_id) do update set
    project_name = excluded.project_name, tagline = excluded.tagline, description = excluded.description,
    cover_image_path = excluded.cover_image_path, prototype_url = excluded.prototype_url,
    slides_path = excluded.slides_path, github_url = excluded.github_url,
    demo_video_url = excluded.demo_video_url, deploy_url = excluded.deploy_url,
    pledge_agreed_at = case when v_pledge then coalesce(x.pledge_agreed_at, now()) end,
    submitted_by = excluded.submitted_by,
    submitted_at = case when will_be_submitted then coalesce(x.submitted_at, now()) end
  returning * into s;

  if old.cover_image_path is not null and old.cover_image_path is distinct from v_cover then removed := removed || old.cover_image_path; end if;
  if old.slides_path is not null and old.slides_path is distinct from v_slides then removed := removed || old.slides_path; end if;
  return jsonb_build_object('submission', to_jsonb(s), 'removed', to_jsonb(removed));
end $$;

-- ───────────────────────── 권한 ─────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'team_of(uuid, boolean)', 'team_assert_editable()', 'submission_assert_open()', 'submission_team(uuid)',
    'team_rename(uuid, text)', 'team_set_role(uuid, text)',
    'submission_assert_file(uuid, text, text[], bigint)', 'submission_save(uuid, jsonb, boolean)'
  ] loop
    execute format('revoke execute on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke execute on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke execute on function %s from authenticated', f); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
  end loop;
end $$;
