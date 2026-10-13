-- 참가 신청 함수 시나리오 테스트 (로컬 Postgres에서 0001, 0002 적용 후 실행)
-- 실패하면 예외로 멈춘다. 끝까지 가면 'ALL APPLY TESTS PASSED'
\set ON_ERROR_STOP on

-- 기대한 오류 코드로 실패하는지 확인
create or replace function expect_error(sql text, code text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'expected % but succeeded: %', code, sql;
exception when others then
  if sqlerrm <> code then raise exception 'expected % but got %: %', code, sqlerrm, sql; end if;
end $$;

-- 테스트 사용자: a~f 참가자(프로필 완료), g 프로필 미완료, j 심사위원
insert into users (id, email, school, role, name, profile_completed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'a@hanyang.ac.kr', 'hanyang', 'participant', 'A', now()),
  ('00000000-0000-0000-0000-00000000000b', 'b@g.skku.edu', 'skku', 'participant', 'B', now()),
  ('00000000-0000-0000-0000-00000000000c', 'c@u.sogang.ac.kr', 'sogang', 'participant', 'C', now()),
  ('00000000-0000-0000-0000-00000000000d', 'd@hanyang.ac.kr', 'hanyang', 'participant', 'D', now()),
  ('00000000-0000-0000-0000-00000000000e', 'e@hanyang.ac.kr', 'hanyang', 'participant', 'E', now()),
  ('00000000-0000-0000-0000-00000000000f', 'f@hanyang.ac.kr', 'hanyang', 'participant', 'F', now()),
  ('00000000-0000-0000-0000-000000000001', 'g@hanyang.ac.kr', 'hanyang', 'participant', 'G', null),
  ('00000000-0000-0000-0000-000000000002', 'judge@gmail.com', null, 'judge', 'J', now());

do $$
declare
  A uuid := '00000000-0000-0000-0000-00000000000a';
  B uuid := '00000000-0000-0000-0000-00000000000b';
  C uuid := '00000000-0000-0000-0000-00000000000c';
  D uuid := '00000000-0000-0000-0000-00000000000d';
  E uuid := '00000000-0000-0000-0000-00000000000e';
  F uuid := '00000000-0000-0000-0000-00000000000f';
  G uuid := '00000000-0000-0000-0000-000000000001';
  J uuid := '00000000-0000-0000-0000-000000000002';
  tm teams;
  app applications;
  code text;
begin
  -- ── 신청 자격 ──
  perform expect_error(format('select apply_save_solo(%L, %L, %L, %L, false)', G, 'FE', '{}', 'x'), 'PROFILE_INCOMPLETE');
  perform expect_error(format('select apply_save_solo(%L, %L, %L, %L, false)', J, 'FE', '{}', 'x'), 'NOT_PARTICIPANT');

  -- ── 개인 참가: 임시 저장 → 미완성 제출 거부 → 제출 → 제출 후 수정해도 제출 유지 ──
  app := apply_save_solo(F, '', '{}', '', false);
  assert app.status = 'draft' and app.kind = 'solo', 'solo draft';
  perform expect_error(format('select apply_save_solo(%L, %L, %L, %L, true)', F, 'FE', '{}', ''), 'INCOMPLETE');
  app := apply_save_solo(F, '프론트엔드', array['React', 'Next.js'], '만들고 싶어요', true);
  assert app.status = 'submitted' and app.submitted_at is not null, 'solo submitted';
  app := apply_save_solo(F, '백엔드', array['Go'], '바꿨어요', false);
  assert app.status = 'submitted' and app.desired_role = '백엔드', 'edit after submit keeps submitted';
  perform expect_error(format('select apply_save_solo(%L, %L, %L, %L, false)', F, '', '{}', ''), 'INCOMPLETE');

  -- 제출한 개인 신청이 있으면 팀을 만들 수 없다 → 취소하면 가능
  perform expect_error(format('select apply_create_team(%L, %L)', F, '팀'), 'HAS_SOLO_APPLICATION');
  perform apply_cancel_solo(F);
  assert not exists (select 1 from applications where user_id = F), 'solo cancelled';

  -- ── 팀 참가: A가 팀 생성, B·C 합류 ──
  perform expect_error(format('select apply_create_team(%L, %L)', A, '  '), 'INVALID_TEAM_NAME');
  tm := apply_create_team(A, '세 학교 팀');
  code := tm.join_code;
  assert length(code) = 6 and tm.leader_id = A and tm.origin = 'applied', 'team created';
  assert (select kind from applications where user_id = A) = 'team', 'leader has team application';
  perform expect_error(format('select apply_create_team(%L, %L)', A, '또 다른 팀'), 'ALREADY_IN_TEAM');

  -- 작성 중이던 개인 신청은 팀 합류 시 지워진다
  perform apply_save_solo(B, '디자인', '{}', '', false);
  perform apply_join_team(B, lower(code));                 -- 소문자 코드도 허용
  assert (select kind from applications where user_id = B) = 'team', 'draft solo replaced by team';
  perform expect_error(format('select apply_join_team(%L, %L)', C, 'ZZZZZZ'), 'CODE_NOT_FOUND');
  perform apply_join_team(C, code);
  perform expect_error(format('select apply_join_team(%L, %L)', C, code), 'ALREADY_IN_TEAM');

  -- ── 제출 조건: 대표만, 역할 작성 필요 ──
  perform expect_error(format('select apply_submit_team(%L)', B), 'NOT_LEADER');
  perform expect_error(format('select apply_submit_team(%L)', A), 'MEMBER_INCOMPLETE');
  perform apply_save_member(A, '기획', array['Figma'], null);
  perform apply_save_member(B, '디자인', '{}', null);
  perform apply_save_member(C, '백엔드', array['Spring'], '열심히');
  assert (select role from team_members where user_id = C) = '백엔드', 'member role saved';

  -- 대표는 팀원이 있으면 나갈 수 없다, 팀원은 나갈 수 있다
  perform expect_error(format('select apply_leave_team(%L)', A), 'LEADER_HAS_MEMBERS');
  perform apply_join_team(D, code);
  perform apply_leave_team(D);
  assert not exists (select 1 from team_members where user_id = D), 'member left';
  assert not exists (select 1 from applications where user_id = D), 'leaver application removed';

  -- 정원(4명) 초과 금지
  perform apply_join_team(D, code);
  perform expect_error(format('select apply_join_team(%L, %L)', E, code), 'TEAM_FULL');
  perform apply_leave_team(D);

  -- ── 제출 ──
  tm := apply_submit_team(A);
  assert tm.application_submitted_at is not null, 'team submitted';
  assert (select count(*) from applications where team_id = tm.id and status = 'submitted') = 3, 'all members submitted';
  perform expect_error(format('select apply_join_team(%L, %L)', E, code), 'TEAM_ALREADY_SUBMITTED');
  perform expect_error(format('select apply_leave_team(%L)', B), 'TEAM_ALREADY_SUBMITTED');
  perform expect_error(format('select apply_rename_team(%L, %L)', A, '새 이름'), 'TEAM_ALREADY_SUBMITTED');
  perform expect_error(format('select apply_save_member(%L, %L, %L, %L)', B, '', '{}', ''), 'INCOMPLETE');
  perform apply_save_member(B, 'UI 디자인', '{}', null);    -- 제출 후에도 마감 전 수정 가능

  -- 제출 취소 → 다시 고칠 수 있음
  tm := apply_withdraw_team(A);
  assert tm.application_submitted_at is null, 'withdrawn';
  assert (select count(*) from applications where team_id = tm.id and status = 'draft') = 3, 'back to draft';
  perform apply_rename_team(A, '이름 바꾼 팀');
  assert (select name from teams where id = tm.id) = '이름 바꾼 팀', 'renamed';

  -- 인원 미달 제출 거부: 혼자 남은 팀
  tm := apply_create_team(E, '1인 팀');
  perform apply_save_member(E, '풀스택', '{}', null);
  perform expect_error(format('select apply_submit_team(%L)', E), 'TEAM_SIZE');
  -- 대표 혼자면 나가기 = 팀 해체
  perform apply_leave_team(E);
  assert not exists (select 1 from teams where id = tm.id), 'team disbanded';

  -- ── 결과가 나온 뒤에는 수정·취소 불가 ──
  perform apply_save_solo(F, '프론트엔드', '{}', '다시 신청', true);
  update applications set status = 'approved', decided_at = now() where user_id = F;
  perform expect_error(format('select apply_save_solo(%L, %L, %L, %L, false)', F, 'x', '{}', 'y'), 'ALREADY_DECIDED');
  perform expect_error(format('select apply_cancel_solo(%L)', F), 'ALREADY_DECIDED');

  -- ── 신청 기간 밖이면 전부 막힌다 ──
  update event_config set apply_close_at = now() - interval '1 minute';
  perform expect_error(format('select apply_join_team(%L, %L)', D, code), 'APPLY_CLOSED');
  perform expect_error(format('select apply_save_member(%L, %L, %L, %L)', A, 'x', '{}', null), 'APPLY_CLOSED');
  update event_config set apply_close_at = null, apply_open_at = now() + interval '1 day';
  perform expect_error(format('select apply_create_team(%L, %L)', D, '팀'), 'APPLY_CLOSED');
  update event_config set apply_open_at = null;

  raise notice 'ALL APPLY TESTS PASSED';
end $$;
