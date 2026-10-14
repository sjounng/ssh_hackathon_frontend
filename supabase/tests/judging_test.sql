-- 심사 함수 테스트 (0001~0008 적용 후, 새 DB에서 실행). 끝까지 가면 'ALL JUDGING TESTS PASSED'
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
  ('00000000-0000-0000-0000-0000000000e1', 'judge@example.com', null, 'judge', '심사', now()),
  ('00000000-0000-0000-0000-000000000011', 'p@hanyang.ac.kr', 'hanyang', 'participant', 'P', now());
insert into teams (id, name, origin, leader_id) values
  ('00000000-0000-0000-0000-0000000000a1', '제출팀', 'assigned', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-0000000000a2', '임시팀', 'assigned', null);
insert into submissions (team_id, project_name, submitted_at) values
  ('00000000-0000-0000-0000-0000000000a1', '제출', now()),
  ('00000000-0000-0000-0000-0000000000a2', '임시', null);
insert into criteria (id, name, min_score, max_score, weight) values
  ('00000000-0000-0000-0000-0000000000c1', '완성도', 1, 5, 2),
  ('00000000-0000-0000-0000-0000000000c2', '창의성', 0, 30, 1);

do $$
declare
  ADM uuid := '00000000-0000-0000-0000-0000000000ad';
  J uuid := '00000000-0000-0000-0000-0000000000e1';
  P uuid := '00000000-0000-0000-0000-000000000011';
  T uuid := '00000000-0000-0000-0000-0000000000a1';
  DRAFT uuid := '00000000-0000-0000-0000-0000000000a2';
  C1 uuid := '00000000-0000-0000-0000-0000000000c1';
  C2 uuid := '00000000-0000-0000-0000-0000000000c2';
  ok jsonb := jsonb_build_array(jsonb_build_object('criterion_id', C1, 'score', 4), jsonb_build_object('criterion_id', C2, 'score', 25));
  n int;
begin
  -- 심사위원만 (운영진·참가자는 점수를 매기지 않는다)
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', ADM, T, ok), 'NOT_JUDGE');
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', P, T, ok), 'NOT_JUDGE');

  -- 심사 기간 밖이면 막는다
  update event_config set judging_start_at = now() + interval '1 hour';
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', J, T, ok), 'JUDGING_CLOSED');
  update event_config set judging_start_at = now() - interval '1 hour', judging_end_at = now() - interval '1 minute';
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', J, T, ok), 'JUDGING_CLOSED');
  update event_config set judging_end_at = now() + interval '1 hour';

  -- 최종 제출한 팀만
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', J, DRAFT, ok), 'NOT_SUBMITTED');

  -- 항목·범위 확인 (하나라도 틀리면 아무것도 저장하지 않는다)
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', J, T,
    jsonb_build_array(jsonb_build_object('criterion_id', C1, 'score', 4), jsonb_build_object('criterion_id', C2, 'score', 31))), 'OUT_OF_RANGE');
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', J, T,
    jsonb_build_array(jsonb_build_object('criterion_id', C1, 'score', 0))), 'OUT_OF_RANGE');
  perform expect_error(format('select judge_save_scores(%L, %L, %L)', J, T,
    jsonb_build_array(jsonb_build_object('criterion_id', '00000000-0000-0000-0000-00000000ffff', 'score', 1))), 'CRITERION_NOT_FOUND');
  if exists (select 1 from scores) then raise exception 'failed save must not leave scores'; end if;

  -- 저장 → 다시 저장하면 고친다
  n := judge_save_scores(J, T, ok);
  if n <> 2 or (select score from scores where criterion_id = C1) <> 4 then raise exception 'save failed'; end if;
  perform judge_save_scores(J, T, jsonb_build_array(jsonb_build_object('criterion_id', C1, 'score', 5)));
  if (select score from scores where criterion_id = C1) <> 5 or (select count(*) from scores) <> 2 then raise exception 'update failed'; end if;

  -- 무효 처리한 점수는 다시 저장해도 무효로 남는다
  update scores set voided_at = now() where judge_id = J and team_id = T;
  perform judge_save_scores(J, T, ok);
  if exists (select 1 from scores where voided_at is null) then raise exception 'voided scores must stay voided'; end if;

  raise notice 'ALL JUDGING TESTS PASSED';
end $$;
