-- 메일 발송 함수 테스트 (0001~0006 적용 후 실행). 끝까지 가면 'ALL MAIL TESTS PASSED'
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
  ('00000000-0000-0000-0000-000000000011', 'a@hanyang.ac.kr', 'hanyang', 'participant', 'A', now()),
  ('00000000-0000-0000-0000-000000000012', 'b@g.skku.edu', 'skku', 'participant', 'B', now());

do $$
declare
  ADM uuid := '00000000-0000-0000-0000-0000000000ad';
  A uuid := '00000000-0000-0000-0000-000000000011';
  B uuid := '00000000-0000-0000-0000-000000000012';
  rows jsonb := jsonb_build_array(
    jsonb_build_object('user_id', A, 'to_email', 'a@hanyang.ac.kr', 'ref', 'approved'),
    jsonb_build_object('user_id', B, 'to_email', 'b@g.skku.edu', 'ref', 'rejected'));
  la uuid;
  lb uuid;
  n int;
begin
  -- 운영진만
  perform expect_error(format('select * from mail_claim(%L, %L, %L)', A, 'selection_result', rows), 'NOT_ADMIN');
  perform expect_error(format('select mail_finish(%L, %L)', A, '[]'), 'NOT_ADMIN');

  -- 처음: 둘 다 queued로 잡힌다
  select count(*) into n from mail_claim(ADM, 'selection_result', rows);
  if n <> 2 then raise exception 'first claim should take 2, got %', n; end if;

  -- 보내는 중에 다시 눌러도 잡히지 않는다
  select count(*) into n from mail_claim(ADM, 'selection_result', rows);
  if n <> 0 then raise exception 'in-flight claim should take 0, got %', n; end if;

  -- A는 보냄, B는 실패
  select id into la from email_logs where user_id = A and status = 'queued';
  select id into lb from email_logs where user_id = B and status = 'queued';
  perform mail_finish(ADM, jsonb_build_array(
    jsonb_build_object('id', la, 'status', 'sent', 'provider_id', 'p-a'),
    jsonb_build_object('id', lb, 'status', 'failed', 'error', 'boom')));
  if (select status from email_logs where id = la) <> 'sent' or (select sent_at from email_logs where id = la) is null then
    raise exception 'A should be sent';
  end if;
  if (select error from email_logs where id = lb) <> 'boom' then raise exception 'B should keep error'; end if;

  -- 이미 끝난 기록은 다시 바꾸지 않는다
  perform mail_finish(ADM, jsonb_build_array(jsonb_build_object('id', la, 'status', 'failed', 'error', 'late')));
  if (select status from email_logs where id = la) <> 'sent' then raise exception 'finished log must not change'; end if;

  -- 같은 내용으로 다시: 보낸 A는 빠지고 실패한 B만 잡힌다
  select count(*) into n from mail_claim(ADM, 'selection_result', rows) where user_id = B;
  if n <> 1 or exists (select 1 from email_logs where user_id = A and status = 'queued') then
    raise exception 'retry should take only B';
  end if;
  update email_logs set status = 'sent', sent_at = clock_timestamp() where user_id = B and status = 'queued';

  -- A의 결정이 바뀌면 다시 대상이 되고, 다시 원래대로 바뀌면 또 대상이 된다 (마지막으로 보낸 내용과 비교)
  select count(*) into n from mail_claim(ADM, 'selection_result', jsonb_build_array(jsonb_build_object('user_id', A, 'to_email', 'a@hanyang.ac.kr', 'ref', 'rejected')));
  if n <> 1 then raise exception 'changed decision should be claimed'; end if;
  update email_logs set status = 'sent', sent_at = clock_timestamp() where user_id = A and status = 'queued';
  select count(*) into n from mail_claim(ADM, 'selection_result', jsonb_build_array(jsonb_build_object('user_id', A, 'to_email', 'a@hanyang.ac.kr', 'ref', 'approved')));
  if n <> 1 then raise exception 'decision changed back should be claimed again'; end if;

  -- 종류가 다르면 따로 센다
  select count(*) into n from mail_claim(ADM, 'team_assignment', jsonb_build_array(jsonb_build_object('user_id', A, 'to_email', 'a@hanyang.ac.kr', 'ref', 'team-1')));
  if n <> 1 then raise exception 'other kind should be claimed separately'; end if;

  -- 10분 넘게 queued인 기록은 실패로 바뀌고 다시 잡힌다
  update email_logs set created_at = now() - interval '11 minutes' where kind = 'team_assignment' and status = 'queued';
  select count(*) into n from mail_claim(ADM, 'team_assignment', jsonb_build_array(jsonb_build_object('user_id', A, 'to_email', 'a@hanyang.ac.kr', 'ref', 'team-1')));
  if n <> 1 or not exists (select 1 from email_logs where kind = 'team_assignment' and status = 'failed' and error = 'TIMEOUT') then
    raise exception 'stale queued should fail and be claimed again';
  end if;

  raise notice 'ALL MAIL TESTS PASSED';
end $$;
