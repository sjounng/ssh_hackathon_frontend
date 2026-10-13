-- 내 팀 · 결과물 제출 함수 시나리오 테스트 (0001~0004 적용 후, 새 DB에서 실행). 끝까지 가면 'ALL TEAM TESTS PASSED'
-- 로컬 Postgres에는 Supabase Storage가 없으므로 storage.objects를 흉내 낸 표에 파일 행을 직접 넣는다
\set ON_ERROR_STOP on

create or replace function expect_error(sql text, code text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'expected % but succeeded: %', code, sql;
exception when others then
  if sqlerrm <> code then raise exception 'expected % but got %: %', code, sqlerrm, sql; end if;
end $$;

insert into users (id, email, school, role, name, profile_completed_at) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@hanyang.ac.kr', 'hanyang', 'admin', '운영', now()),
  ('00000000-0000-0000-0000-000000000011', 's1@hanyang.ac.kr', 'hanyang', 'participant', 'S1', now()),
  ('00000000-0000-0000-0000-000000000012', 's2@g.skku.edu', 'skku', 'participant', 'S2', now()),
  ('00000000-0000-0000-0000-000000000013', 's3@u.sogang.ac.kr', 'sogang', 'participant', 'S3', now());

do $$
declare
  ADM uuid := '00000000-0000-0000-0000-0000000000ad';
  S1 uuid := '00000000-0000-0000-0000-000000000011';
  S2 uuid := '00000000-0000-0000-0000-000000000012';
  S3 uuid := '00000000-0000-0000-0000-000000000013';
  t teams;
  r jsonb;
  p jsonb;
  team_dir text;
begin
  perform apply_save_solo(S1, 'FE', '{}', '동기', true);
  perform apply_save_solo(S2, 'BE', '{}', '동기', true);
  perform apply_save_solo(S3, '디자인', '{}', '동기', true);

  -- 선발 전에는 팀 기능을 쓸 수 없다
  perform expect_error(format('select team_set_role(%L, %L)', S1, 'FE'), 'NOT_APPROVED');

  perform admin_decide(ADM, array(select id from applications where user_id in (S1, S2)), 'approved');
  perform expect_error(format('select team_set_role(%L, %L)', S1, 'FE'), 'NOT_IN_TEAM');

  -- 팀장 없이 배정
  t := admin_create_team(ADM, null, array[S1, S2], null);
  team_dir := t.id::text || '/';

  -- 배정 발표 전에는 팀이 보이지 않는다
  update event_config set team_assign_at = now() + interval '1 day';
  perform expect_error(format('select team_set_role(%L, %L)', S1, 'FE'), 'NOT_IN_TEAM');
  update event_config set team_assign_at = now() - interval '1 minute';

  -- 팀장이 없으면 팀원 누구나 팀명을 정한다
  perform team_rename(S2, '  배정팀  ');
  assert (select name from teams where id = t.id) = '배정팀', 'renamed by member';
  perform expect_error(format('select team_rename(%L, %L)', S1, ''), 'INVALID_TEAM_NAME');

  perform team_set_role(S1, '프론트엔드');
  assert (select role from team_members where user_id = S1) = '프론트엔드', 'role saved';
  perform expect_error(format('select team_set_role(%L, %L)', S1, ' '), 'INVALID_ROLE');

  -- 결과물: 팀장만
  p := jsonb_build_object('project_name', '프로젝트');
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p), 'NOT_LEADER');
  perform admin_set_leader(ADM, t.id, S1);
  perform expect_error(format('select team_rename(%L, %L)', S2, '다른 이름'), 'NOT_LEADER');

  -- 제출 기간
  update event_config set event_start_at = now() + interval '1 hour';
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p), 'SUBMIT_NOT_OPEN');
  update event_config set event_start_at = now() - interval '1 hour';

  -- 임시 저장: 프로젝트명만 있으면 된다
  perform expect_error(format('select submission_save(%L, %L, false)', S1, '{}'), 'PROJECT_NAME_REQUIRED');
  r := submission_save(S1, p, false);
  assert r->'submission'->>'submitted_at' is null, 'draft not submitted';

  -- 입력 확인
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p || '{"prototype_url": "javascript:alert(1)"}'), 'INVALID_URL');
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p || '{"github_url": "https://gitlab.com/a/b"}'), 'INVALID_GITHUB');

  -- 제출: 필수 항목·서약
  perform expect_error(format('select submission_save(%L, %L, true)', S1, p), 'INCOMPLETE');

  -- 파일: 이 팀 폴더에 실제로 있는 것만
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p || jsonb_build_object('slides_path', team_dir || 'slides-1.pdf')), 'FILE_NOT_FOUND');
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p || jsonb_build_object('slides_path', 'other-team/slides.pdf')), 'INVALID_FILE');
  insert into storage.objects (bucket_id, name, metadata) values
    ('submissions', team_dir || 'slides-1.pdf', '{"mimetype": "application/pdf", "size": 1000}'),
    ('submissions', team_dir || 'slides-2.pdf', '{"mimetype": "application/pdf", "size": 2000}'),
    ('submissions', team_dir || 'cover-1.png', '{"mimetype": "image/png", "size": 6000000}'),
    ('submissions', team_dir || 'cover-2.pdf', '{"mimetype": "application/pdf", "size": 100}');
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p || jsonb_build_object('cover_image_path', team_dir || 'cover-1.png')), 'FILE_TOO_LARGE');
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p || jsonb_build_object('cover_image_path', team_dir || 'cover-2.pdf')), 'INVALID_FILE');

  p := p || jsonb_build_object('prototype_url', 'https://figma.com/proto/x', 'github_url', 'https://github.com/team/repo',
                               'slides_path', team_dir || 'slides-1.pdf');
  perform expect_error(format('select submission_save(%L, %L, true)', S1, p), 'PLEDGE_REQUIRED');
  r := submission_save(S1, p || '{"pledge": true}', true);
  assert r->'submission'->>'submitted_at' is not null, 'submitted';
  assert jsonb_array_length(r->'removed') = 0, 'nothing removed';

  -- 제출 뒤에는 필수 항목을 비울 수 없다 (임시 저장으로 바꿔도)
  perform expect_error(format('select submission_save(%L, %L, false)', S1, (p - 'github_url') || '{"pledge": true}'), 'INCOMPLETE');

  -- 발표자료를 바꾸면 옛 파일 경로를 돌려준다
  r := submission_save(S1, p || jsonb_build_object('slides_path', team_dir || 'slides-2.pdf', 'pledge', true), false);
  assert r->'submission'->>'submitted_at' is not null, 'stays submitted';
  assert r->'removed' = to_jsonb(array[team_dir || 'slides-1.pdf']), 'old slides returned';

  -- 마감 뒤에는 결과물도 팀 정보도 못 바꾼다
  update event_config set submit_deadline_at = now() - interval '1 minute';
  perform expect_error(format('select submission_save(%L, %L, false)', S1, p || '{"pledge": true}'), 'SUBMIT_CLOSED');
  perform expect_error(format('select team_set_role(%L, %L)', S2, 'BE'), 'TEAM_LOCKED');
  perform expect_error(format('select team_rename(%L, %L)', S1, '새 이름'), 'TEAM_LOCKED');

  raise notice 'ALL TEAM TESTS PASSED';
end $$;
