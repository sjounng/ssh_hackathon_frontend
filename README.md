# SSH HACKATHON 웹사이트

서강대 × 성균관대 × 한양대 연합 해커톤(SSH HACKATHON) 웹사이트: 소개, 참가 신청, 선발·팀 배정, 결과물 제출, 심사, 결과 발표.

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/app/` | Next.js App Router 진입점 (`layout.jsx`: 글꼴·메타데이터, `page.jsx`: 메인 페이지, `globals.css`: 전체 스타일) |
| `src/content.js` | **페이지의 모든 문구.** 문구 수정은 이 파일만 고치면 된다 (일정·평가 항목은 관리자 페이지) |
| `src/sections/` | 메인 페이지 섹션 (Hero, About, Prizes, Eligibility, Review, Schedule, Cta) |
| `src/components/` | 공통 부품 (Header, Backdrop·Sphere 배경, ApplyButton, 관리자·심사·갤러리 화면 등) |
| `src/lib/` | 서버 코드 (신청·팀·관리자·메일·심사·결과) 와 공용 계산 (`schedule.js`: 날짜 표시(한국 시각), `scoring.js`: 심사 점수 집계) |

## 문구 채우기

- `content.js`에서 대괄호로 감싼 값(`[행사명]` 등)은 아직 정해지지 않은 자리표시다. 화면에는 대괄호째 그대로 보인다.
- 일정(날짜)과 팀 인원은 `content.js`에 없다. 관리자 페이지 > 일정에 넣으면 첫 화면의 일시·신청 버튼·행사 일정·참가 자격에 그대로 보이고, 비어 있는 날짜는 `[미정]`으로 보인다.
- 신청 시작·마감을 비워 두면 서버가 그쪽 제한 없이 신청을 받는다. 운영 전에 반드시 채운다.

## 디자인 (홍보 포스터 기준)

- 차콜 바탕, 오른쪽 가장자리에서 번지는 스펙트럼 빛(서강 빨강 → 성균관 초록 → 한양 파랑), 크게 걸친 점선 원. 섹션 제목은 ◆ + 굵은 제목, 본문 왼쪽에 가는 세로선. 상자는 버튼과 같은 둥근 리퀴드 글래스. 글꼴은 Pretendard 하나
- 배경: `components/Backdrop.jsx` (모든 페이지, CSS만). 메인 페이지는 같은 자리에 `components/Sphere.jsx`의 점선 구체가 그려지고 정적인 점선 원은 숨는다
- 점선 구체는 three.js 없이 2D 캔버스로 그린다(경도·위도선을 점으로, 윤곽은 점선 원). 회전 속도·점 간격·기울기는 `Sphere.jsx` 위쪽 상수, 위치·크기는 `globals.css`의 `--ring-x`, `--ring-y`, `--ring-r`(점선 원과 공용)로 조절한다. 움직임 줄이기 설정이면 멈춘 채로 그린다

## 백엔드 (로그인·데이터)

- Next.js API 라우트(`src/app/api/`)가 백엔드. 서버를 따로 두지 않고 Vercel에 함께 배포된다.
- 로그인: NextAuth(`src/auth.js`) + Google. 학교 도메인(`allowed_domains`) 또는 초청 목록(`invited_emails`) 계정만 통과
- DB: Supabase. 서버만 service role 키로 접근하고, 모든 테이블은 RLS로 직접 접근을 막는다
- 설계: [`docs/DB_DESIGN.md`](docs/DB_DESIGN.md), 테이블 SQL: [`supabase/migrations/`](supabase/migrations/)

### 처음 설정

1. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/migrations/`의 SQL 파일을 번호 순서대로 실행
2. Google Cloud Console에서 OAuth 클라이언트(웹 애플리케이션)를 만들고, 승인된 리디렉션 URI에 추가
   - `http://localhost:3000/api/auth/callback/google`, `http://localhost:5173/api/auth/callback/google` (로컬)
   - `https://ssh-hackathon-frontend.vercel.app/api/auth/callback/google` (운영)
3. `.env.example`을 `.env.local`로 복사해 값을 채운다. 운영은 Vercel 환경변수에 같은 이름으로 넣는다
4. 첫 운영진 지정: 로그인 한 번 한 뒤 Supabase에서 `update users set role = 'admin' where email = '...';` (그 뒤로는 관리자 페이지 > 계정에서 지정)
5. 관리자 페이지 > 일정에서 신청 기간 등 일정을 채운다

### 연결 점검

```bash
npm run check:db      # Supabase 연결, 테이블·함수·버킷 확인 (키 값은 출력하지 않음)
npm run smoke:apply   # 실제 DB에서 팀 신청 흐름을 돌리고 테스트 데이터를 지움
npm run smoke:team    # 실제 DB에서 내 팀·결과물 제출(파일 업로드 포함) 흐름을 돌리고 테스트 데이터·파일을 지움
```

### 안내 메일 (Resend)

관리자 페이지 > 메일에서 선발 결과·팀 배정 메일을 보낸다. 문구는 `content.js`의 `MAIL`에 있다.

1. resend.com에서 API 키를 만들어 `RESEND_API_KEY`에 넣는다
2. `MAIL_FROM`: 도메인 인증 전에는 `onboarding@resend.dev`만 쓸 수 있고, 이때는 Resend 계정 주인의 메일로만 보내진다. 도메인을 인증하면 `연합 해커톤 <noreply@도메인>`처럼 바꾼다
3. 관리자 페이지 > 메일 > "나에게 테스트 발송"으로 문구를 확인한 뒤 "남은 N명에게 보내기"

- 한 사람에게 같은 내용을 두 번 보내지 않는다. 선발 결과는 결정이, 팀 배정은 팀이 바뀌면 다시 보낼 대상이 되고, 보내지 못한 사람도 다음에 함께 보낸다 (기록: `email_logs`)
- 문구에 대괄호 자리표시(`[행사명]` 등)가 남아 있으면 일괄 발송이 막힌다
- 메일 속 링크는 운영 도메인(`VERCEL_PROJECT_PRODUCTION_URL`, 없으면 관리자가 접속한 주소)을 쓴다

### DB 규칙 테스트

참가 신청·관리자·내 팀·결과물·메일·심사 규칙은 DB 함수(`supabase/migrations/0002~0008`)에 있고, 로컬 Postgres로 시험할 수 있다.
(Supabase처럼 `anon`·`authenticated`·`service_role` 역할과, `storage.buckets`·`storage.objects(bucket_id, name, metadata)` 표를 먼저 만들어 둔다. `service_role`은 Supabase처럼 RLS를 우회해야 한다: `create role service_role nologin bypassrls`. 없으면 권한 테스트가 실패한다)

```bash
# 빈 DB에 마이그레이션을 적용한 뒤
psql -f supabase/tests/apply_test.sql   # 끝까지 가면 'ALL APPLY TESTS PASSED'
psql -f supabase/tests/admin_test.sql   # 'ALL ADMIN TESTS PASSED' (새 DB에서)
psql -f supabase/tests/team_test.sql    # 'ALL TEAM TESTS PASSED' (새 DB에서)
psql -f supabase/tests/mail_test.sql    # 'ALL MAIL TESTS PASSED' (새 DB에서)
psql -f supabase/tests/judging_test.sql # 'ALL JUDGING TESTS PASSED' (새 DB에서)
psql -f supabase/tests/grants_test.sql  # 'ALL GRANT TESTS PASSED'
```

## 배포

Vercel에 배포되어 있다: https://ssh-hackathon-frontend.vercel.app

- `main` 브랜치에 푸시하면 자동으로 운영 사이트에 배포된다.
- 다른 브랜치에 푸시하거나 PR을 열면 미리보기 주소가 따로 만들어진다.

## 사용 라이브러리

Next.js 16 (App Router), React, NextAuth(Auth.js), Supabase(supabase-js), Resend(메일, HTTP API로 직접 호출)
