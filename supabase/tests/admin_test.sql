-- 관리자 함수 시나리오 테스트 (0001~0003 적용 후 실행). 끝까지 가면 'ALL ADMIN TESTS PASSED'
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
  ('00000000-0000-0000-0000-000000000013', 's3@u.sogang.ac.kr', 'sogang', 'participant', 'S3', now()),
  ('00000000-0000-0000-0000-000000000014', 's4@hanyang.ac.kr', 'hanyang', 'participant', 'S4', now()),
  ('00000000-0000-0000-0000-000000000021', 't1@hanyang.ac.kr', 'hanyang', 'participant', 'T1', now()),
  ('00000000-0000-0000-0000-000000000022', 't2@g.skku.edu', 'skku', 'participant', 'T2', now());

do $$
declare
  ADM uuid := '00000000-0000-0000-0000-0000000000ad';
  S1 uuid := '00000000-0000-0000-0000-000000000011';
  S2 uuid := '00000000-0000-0000-0000-000000000012';
  S3 uuid := '00000000-0000-0000-0000-000000000013';
  S4 uuid := '00000000-0000-0000-0000-000000000014';
  T1 uuid := '00000000-0000-0000-0000-000000000021';
  T2 uuid := '00000000-0000-0000-0000-000000000022';
  applied teams;
  assigned teams;
  n int;
begin
  -- 신청 준비: 개인 4명 제출(S4는 작성 중), 팀 2명 제출
  perform apply_save_solo(S1, 'FE', '{}', '동기', true);
  perform apply_save_solo(S2, 'BE', '{}', '동기', true);
  perform apply_save_solo(S3, '디자인', '{}', '동기', true);
  perform apply_save_solo(S4, 'PM', '{}', '', false);
  applied := apply_create_team(T1, '신청팀');
  perform apply_join_team(T2, applied.join_code);
  perform apply_save_member(T1, '기획', '{}', null);
  perform apply_save_member(T2, '개발', '{}', null);
  perform apply_submit_team(T1);

  -- 운영진만
  perform expect_error(format('select admin_decide(%L, %L, %L)', S1, array[(select id from applications where user_id = S1)], 'approved'), 'NOT_ADMIN');

  -- 작성 중 신청은 결정 불가
  perform expect_error(format('select admin_decide(%L, %L, %L)', ADM, array[(select id from applications where user_id = S4)], 'approved'), 'NOT_SUBMITTED');

  -- 개인 승인 3명
  n := admin_decide(ADM, array(select id from applications where user_id in (S1, S2, S3)), 'approved');
  assert n = 3, 'three approved';
  assert (select decided_by from applications where user_id = S1) = ADM, 'decided_by recorded';

  -- 팀 신청은 한 명만 골라도 팀원 전원이 함께 결정된다
  n := admin_decide(ADM, array[(select id from applications where user_id = T2)], 'rejected');
  assert n = 2, 'team decided together';
  assert (select status from applications where user_id = T1) = 'rejected', 'leader rejected too';
  -- 결정 취소 → 다시 제출 상태
  perform admin_decide(ADM, array[(select id from applications where user_id = T1)], 'submitted');
  assert (select count(*) from applications where team_id = applied.id and status = 'submitted' and decided_at is null) = 2, 'undo decision';

  -- 팀 배정: 승인된 개인만, 팀장은 팀원 중에서
  perform expect_error(format('select admin_create_team(%L, %L, %L, null)', ADM, 'X', array[S1, S4]), 'NOT_APPROVED_SOLO');
  perform expect_error(format('select admin_create_team(%L, %L, %L, %L)', ADM, 'X', array[S1, S2], S3), 'LEADER_NOT_MEMBER');
  assigned := admin_create_team(ADM, '배정팀', array[S1, S2], S1);
  assert assigned.origin = 'assigned' and assigned.leader_id = S1, 'assigned team';
  assert (select role from team_members where user_id = S2) = 'BE', 'role copied from application';
  perform expect_error(format('select admin_create_team(%L, %L, %L, null)', ADM, 'Y', array[S2]), 'ALREADY_IN_TEAM');

  -- 배정된 개인은 승인 취소 불가
  perform expect_error(format('select admin_decide(%L, %L, %L)', ADM, array[(select id from applications where user_id = S1)], 'rejected'), 'ALREADY_ASSIGNED');

  -- 팀원 추가·팀장 변경·제외
  perform admin_add_member(ADM, assigned.id, S3);
  assert (select count(*) from team_members where team_id = assigned.id) = 3, 'member added';
  perform expect_error(format('select admin_add_member(%L, %L, %L)', ADM, applied.id, S3), 'NOT_ASSIGNED_TEAM');
  perform admin_set_leader(ADM, assigned.id, S3);
  perform expect_error(format('select admin_set_leader(%L, %L, %L)', ADM, assigned.id, T1), 'NOT_IN_TEAM');
  perform admin_remove_member(ADM, assigned.id, S3);
  assert (select leader_id from teams where id = assigned.id) is null, 'leader cleared when removed';

  -- 발표 순서
  perform admin_set_presentation_order(ADM, array[assigned.id, applied.id]);
  assert (select presentation_order from teams where id = applied.id) = 2, 'order set';
  perform admin_set_presentation_order(ADM, array[applied.id]);
  assert (select presentation_order from teams where id = assigned.id) is null, 'order cleared';
  assert (select presentation_order from teams where id = applied.id) = 1, 'order reset';

  -- 마지막 팀원을 빼면 팀이 없어진다
  perform admin_remove_member(ADM, assigned.id, S1);
  perform admin_remove_member(ADM, assigned.id, S2);
  assert not exists (select 1 from teams where id = assigned.id), 'empty team removed';

  raise notice 'ALL ADMIN TESTS PASSED';
end $$;
