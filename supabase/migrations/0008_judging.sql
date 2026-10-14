-- 심사 (기획서 기능 7: 외부 심사위원 심사)
-- 심사위원이 팀마다 평가 항목별 점수를 한 번에 저장한다. 0002~0006과 같은 방식: 서버(service role)만 호출하고,
-- 실패는 영문 코드로 raise 해 API에서 한글 안내로 바꾼다.
-- 평가 항목(criteria)과 무효 처리(scores.voided_at)는 운영진이 관리자 화면에서 다룬다

-- p_scores: [{ criterion_id, score }]. 이미 매긴 점수는 고친다. 운영진이 무효 처리한 점수는 다시 저장해도 무효로 남는다
create or replace function judge_save_scores(p_judge uuid, p_team uuid, p_scores jsonb) returns int language plpgsql as $$
declare
  c event_config;
  r record;
  n int := 0;
begin
  if not exists (select 1 from users where id = p_judge and role = 'judge') then raise exception 'NOT_JUDGE'; end if;
  select * into c from event_config;
  if (c.judging_start_at is not null and now() < c.judging_start_at)
     or (c.judging_end_at is not null and now() > c.judging_end_at) then
    raise exception 'JUDGING_CLOSED';
  end if;
  if not exists (select 1 from submissions where team_id = p_team and submitted_at is not null) then
    raise exception 'NOT_SUBMITTED';
  end if;

  for r in
    select x.criterion_id, x.score, k.id as found, k.min_score, k.max_score
      from jsonb_to_recordset(p_scores) as x(criterion_id uuid, score numeric)
      left join criteria k on k.id = x.criterion_id
  loop
    if r.found is null then raise exception 'CRITERION_NOT_FOUND'; end if;
    if r.score is null or r.score < r.min_score or r.score > r.max_score then raise exception 'OUT_OF_RANGE'; end if;
    insert into scores (judge_id, team_id, criterion_id, score) values (p_judge, p_team, r.criterion_id, r.score)
    on conflict (judge_id, team_id, criterion_id) do update set score = excluded.score;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ───────────────────────── 권한 ─────────────────────────
do $$
declare f text := 'judge_save_scores(uuid, uuid, jsonb)';
begin
  execute format('revoke execute on function %s from public', f);
  if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke execute on function %s from anon', f); end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke execute on function %s from authenticated', f); end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
end $$;
