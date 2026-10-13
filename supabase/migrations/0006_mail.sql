-- 안내 메일 발송 (기획서 기능 9: 선발 결과 · 팀 배정 메일)
-- 서버가 Resend로 보내고 email_logs에 남긴다. 규칙: 한 사람에게 같은 내용(ref)을 두 번 보내지 않는다.
--   ref — 선발 결과는 결정('approved' / 'rejected'), 팀 배정은 팀 id. 결정이나 팀이 바뀌면 다시 보낼 대상이 된다
-- 0003과 같은 방식: 서버(service role)만 호출하고, 첫 인자로 운영진 id를 받아 다시 확인한다.

alter table email_logs add column if not exists ref text;
alter table email_logs add column if not exists provider_id text;   -- Resend 메일 id (발송 확인·문의용)
create index if not exists email_logs_user_idx on email_logs (kind, user_id);
-- 같은 사람에게 같은 종류의 메일을 동시에 두 번 보내지 않도록, 보내는 중(queued)인 기록은 한 사람당 한 건만 둔다
create unique index if not exists email_logs_one_queued on email_logs (kind, user_id) where status = 'queued';

-- 보낼 대상 잡기: 넘겨받은 대상 중 마지막으로 보낸 내용(ref)이 다른 사람만 queued 기록을 만들어 돌려준다.
-- 보내는 중인 사람은 건너뛴다(동시에 두 번 눌러도 한 번만 나간다). 10분 넘게 queued인 기록은 중간에 끊긴 것으로 보고 실패 처리한다
-- p_rows: [{ user_id, to_email, ref }]
create or replace function mail_claim(p_admin uuid, p_kind email_kind, p_rows jsonb) returns setof email_logs language plpgsql as $$
begin
  perform admin_assert(p_admin);
  update email_logs set status = 'failed', error = 'TIMEOUT'
   where status = 'queued' and created_at < now() - interval '10 minutes';

  return query
    insert into email_logs (kind, user_id, to_email, ref, status)
    select p_kind, r.user_id, r.to_email, r.ref, 'queued'
      from jsonb_to_recordset(p_rows) as r(user_id uuid, to_email text, ref text)
     where (select l.ref from email_logs l
             where l.kind = p_kind and l.user_id = r.user_id and l.status = 'sent'
             order by l.sent_at desc limit 1) is distinct from r.ref
    on conflict (kind, user_id) where status = 'queued' do nothing
    returning *;
end $$;

-- 발송 결과 기록: queued인 기록만 sent / failed로 바꾼다
-- p_results: [{ id, status: 'sent' | 'failed', provider_id, error }]
create or replace function mail_finish(p_admin uuid, p_results jsonb) returns void language plpgsql as $$
begin
  perform admin_assert(p_admin);
  update email_logs l
     set status = r.status,
         provider_id = r.provider_id,
         error = r.error,
         sent_at = case when r.status = 'sent' then clock_timestamp() end
    from jsonb_to_recordset(p_results) as r(id uuid, status text, provider_id text, error text)
   where l.id = r.id and l.status = 'queued' and r.status in ('sent', 'failed');
end $$;

-- ───────────────────────── 권한 ─────────────────────────
do $$
declare f text;
begin
  foreach f in array array['mail_claim(uuid, email_kind, jsonb)', 'mail_finish(uuid, jsonb)'] loop
    execute format('revoke execute on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke execute on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke execute on function %s from authenticated', f); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
  end loop;
end $$;
