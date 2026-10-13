-- 권한 테스트: Supabase처럼 anon / authenticated / service_role 역할을 만든 DB에서 실행
-- (역할은 마이그레이션 적용 전에 만들어 두어야 한다)
-- service_role은 테이블·함수를 쓸 수 있고, anon·authenticated는 아무것도 못 해야 한다
\set ON_ERROR_STOP on

create or replace function expect_denied(r text, sql text) returns void language plpgsql as $$
begin
  execute format('set local role %I', r);
  begin
    execute sql;
    reset role;
    raise exception 'expected permission denied for % but succeeded: %', r, sql;
  exception when insufficient_privilege then
    reset role;
  end;
end $$;

begin;
-- service_role: 읽기·쓰기·함수 호출 가능
set local role service_role;
select count(*) from users;
insert into users (email, school, role, name, profile_completed_at) values ('svc@hanyang.ac.kr', 'hanyang', 'participant', 'S', now());
select apply_create_team((select id from users where email = 'svc@hanyang.ac.kr'), '권한 테스트 팀');
reset role;

-- 공개 역할: 테이블 읽기와 함수 호출 모두 거부
select expect_denied('anon', 'select count(*) from users');
select expect_denied('authenticated', 'select count(*) from applications');
select expect_denied('anon', 'insert into users (email) values (''x@y.z'')');
select expect_denied('authenticated', $q$select apply_join_team('00000000-0000-0000-0000-000000000000', 'AAAAAA')$q$);
select expect_denied('anon', $q$select admin_assert('00000000-0000-0000-0000-000000000000')$q$);
select expect_denied('authenticated', $q$select submission_save('00000000-0000-0000-0000-000000000000', '{}', true)$q$);
select expect_denied('anon', $q$select team_rename('00000000-0000-0000-0000-000000000000', 'x')$q$);
rollback;

select 'ALL GRANT TESTS PASSED';
