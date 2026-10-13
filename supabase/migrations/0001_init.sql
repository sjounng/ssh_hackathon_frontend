-- 연합 해커톤 웹사이트 초기 스키마
-- 설계 설명: docs/DB_DESIGN.md
--
-- 접근 방식: 브라우저는 DB에 직접 접근하지 않는다. 모든 읽기·쓰기는 Next.js API 라우트(서버)가
-- service role 키로 수행하고, 로그인 사용자·권한 확인도 서버 코드에서 한다.
-- 그래서 모든 테이블에 RLS를 켜고 정책을 두지 않는다 → anon/authenticated 키로는 아무것도 읽거나 쓸 수 없다.

create extension if not exists pgcrypto;

-- ───────────────────────── 열거형 ─────────────────────────
create type school as enum ('hanyang', 'skku', 'sogang');
create type user_role as enum ('participant', 'judge', 'admin');
create type application_kind as enum ('solo', 'team');
create type application_status as enum ('draft', 'submitted', 'approved', 'rejected');
create type team_origin as enum ('applied', 'assigned'); -- applied: 팀으로 신청한 팀 / assigned: 운영진이 개인 참가자로 구성한 팀
create type email_kind as enum ('selection_result', 'team_assignment');

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── 로그인 허용 ─────────────────────────
-- 학교 Google 계정 도메인 → 소속 학교 판별 (기획서 개요 > 로그인 허용 Google 계정)
create table allowed_domains (
  domain text primary key,          -- 예: 'hanyang.ac.kr'
  school school not null
);
insert into allowed_domains (domain, school) values
  ('hanyang.ac.kr', 'hanyang'),
  ('g.skku.edu', 'skku'),
  ('u.sogang.ac.kr', 'sogang');

-- 학교 계정이 아닌 사람(외부 심사위원, 학교 계정이 없는 운영진)의 로그인 허용 목록
create table invited_emails (
  email      text primary key,
  role       user_role not null check (role <> 'participant'),
  note       text,                   -- 예: '심사위원 — ○○회사'
  created_at timestamptz not null default now()
);

-- ───────────────────────── 사용자 ─────────────────────────
create table users (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique,
  school               school,                   -- 학교 계정이면 도메인으로 채움, 외부 초청자는 null
  role                 user_role not null default 'participant',
  name                 text,
  student_id           text,
  phone                text,
  privacy_agreed_at    timestamptz,              -- 필수 동의 시각
  profile_completed_at timestamptz,              -- 최초 로그인 후 프로필 입력 완료 시각
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger users_updated_at before update on users for each row execute function set_updated_at();

-- ───────────────────────── 행사 일정·설정 (한 행만 존재) ─────────────────────────
create table event_config (
  id                    boolean primary key default true check (id),
  apply_open_at         timestamptz,
  apply_close_at        timestamptz,
  selection_announce_at timestamptz,
  team_assign_at        timestamptz,
  event_start_at        timestamptz,
  event_end_at          timestamptz,
  submit_deadline_at    timestamptz,
  judging_start_at      timestamptz,
  judging_end_at        timestamptz,
  results_published_at  timestamptz,             -- null이면 결과 비공개
  team_min_size         int not null default 2,   -- 팀 신청·운영진 배정 팀 모두 적용
  team_max_size         int not null default 4,
  updated_at            timestamptz not null default now()
);
insert into event_config default values;
create trigger event_config_updated_at before update on event_config for each row execute function set_updated_at();

-- ───────────────────────── 팀 ─────────────────────────
create table teams (
  id                       uuid primary key default gen_random_uuid(),
  name                     text,
  origin                   team_origin not null,
  join_code                text unique,          -- 팀 신청 시 발급하는 참가 코드 (assigned 팀은 null)
  leader_id                uuid references users (id) on delete set null,
  application_submitted_at timestamptz,          -- 팀 신청서를 대표가 제출한 시각 (applied 팀)
  presentation_order       int unique,           -- 발표 순서 (운영진 지정)
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (origin = 'assigned' or join_code is not null)
);
create trigger teams_updated_at before update on teams for each row execute function set_updated_at();

-- 한 사람은 한 팀에만 속한다 (user_id unique)
create table team_members (
  team_id   uuid not null references teams (id) on delete cascade,
  user_id   uuid not null unique references users (id) on delete cascade,
  role      text,                                -- 팀 안에서의 역할 (예: 프론트엔드, 디자인)
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ───────────────────────── 참가 신청 (사람마다 하나) ─────────────────────────
-- 팀 신청도 팀원 각자 한 행씩 가진다. 선발 결과(status)는 사람 단위로 저장하고,
-- 팀 신청의 승인·거절은 운영진 처리 시 그 팀 팀원 전원의 행을 한 번에 바꾼다.
create table applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references users (id) on delete cascade,
  kind          application_kind not null,
  team_id       uuid references teams (id) on delete set null,   -- 팀 신청이면 신청한 팀
  desired_role  text,
  tech_stack    text[] not null default '{}',
  motivation    text,
  status        application_status not null default 'draft',
  submitted_at  timestamptz,
  decided_at    timestamptz,
  decided_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (kind = 'team' or team_id is null)
);
create index applications_status_idx on applications (status);
create index applications_team_idx on applications (team_id);
create trigger applications_updated_at before update on applications for each row execute function set_updated_at();

-- ───────────────────────── 결과물 제출 (팀마다 하나) ─────────────────────────
-- 파일(발표자료 PDF, 대표 이미지)은 Supabase Storage 'submissions' 버킷에 두고 경로만 저장한다.
-- 프로토타입은 파일 업로드 없이 링크(배포 주소·Figma 등)로만 받는다
create table submissions (
  team_id             uuid primary key references teams (id) on delete cascade,
  project_name        text not null,
  tagline             text,                       -- 한 줄 소개
  description         text,
  cover_image_path    text,                       -- 대표 이미지 (5MB, png/jpg/webp)
  prototype_url       text,                       -- 프로토타입 링크 (필수)
  slides_path         text,                       -- 발표자료 PDF (필수, 20MB)
  github_url          text,                       -- 필수
  demo_video_url      text,
  deploy_url          text,
  pledge_agreed_at    timestamptz,                -- 제출 서약 (홍보 활용 동의 등)
  submitted_by        uuid references users (id) on delete set null,
  submitted_at        timestamptz,                -- 최초 제출 시각 (마감 전까지 수정 가능)
  updated_at          timestamptz not null default now()
);
create trigger submissions_updated_at before update on submissions for each row execute function set_updated_at();

-- ───────────────────────── 심사 (기획 확정 전 · 바뀔 수 있음) ─────────────────────────
-- 외부 심사위원(users.role = 'judge')이 평가 항목별 점수를 매기는 형태를 가정한다.
-- 점수 방식이 미정이라 항목마다 최저·최고점을 둔다: 1~5점(1,5), 1~10점(1,10), 배점제(0,30) 모두 표현 가능
create table criteria (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  min_score   numeric not null default 1,
  max_score   numeric not null default 5 check (max_score > min_score),
  weight      numeric not null default 1 check (weight >= 0),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table scores (
  judge_id     uuid not null references users (id) on delete cascade,
  team_id      uuid not null references teams (id) on delete cascade,
  criterion_id uuid not null references criteria (id) on delete cascade,
  score        numeric not null,                   -- 범위(criteria.min_score~max_score)는 서버에서 확인
  voided_at    timestamptz,                         -- 운영진이 특정 평가를 무효 처리한 시각
  updated_at   timestamptz not null default now(),
  primary key (judge_id, team_id, criterion_id)
);
create trigger scores_updated_at before update on scores for each row execute function set_updated_at();

-- ───────────────────────── 수상 ─────────────────────────
create table awards (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams (id) on delete cascade,
  title      text not null,                         -- 예: 대상
  rank       int,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 메일 발송 기록 ─────────────────────────
create table email_logs (
  id         uuid primary key default gen_random_uuid(),
  kind       email_kind not null,
  user_id    uuid references users (id) on delete set null,
  to_email   text not null,
  status     text not null default 'queued',        -- queued | sent | failed
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

-- ───────────────────────── 접근 차단 (RLS) ─────────────────────────
-- 정책을 두지 않으므로 서버의 service role 키로만 접근 가능
alter table allowed_domains enable row level security;
alter table invited_emails  enable row level security;
alter table users           enable row level security;
alter table event_config    enable row level security;
alter table teams           enable row level security;
alter table team_members    enable row level security;
alter table applications    enable row level security;
alter table submissions     enable row level security;
alter table criteria        enable row level security;
alter table scores          enable row level security;
alter table awards          enable row level security;
alter table email_logs      enable row level security;

-- ───────────────────────── 테이블 권한 ─────────────────────────
-- Supabase에서 "Automatically expose new tables"를 끄면 새 테이블 권한이 자동으로 주어지지 않는다.
-- 서버용 service_role에만 직접 주고, 공개 역할(anon, authenticated)은 막는다.
-- (로컬 Postgres처럼 이 역할들이 없는 환경에서는 건너뛴다)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select, insert, update, delete on all tables in schema public to service_role;
    grant usage on all sequences in schema public to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
  end if;
end $$;

-- ───────────────────────── 파일 저장소 ─────────────────────────
-- 비공개 버킷: 파일은 서버가 짧은 유효기간의 서명 URL을 만들어 내려준다.
-- 버킷 한도는 큰 쪽(PDF 20MB)에 맞추고, 종류별 한도(이미지 5MB)는 서버에서 확인한다
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 20971520, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
