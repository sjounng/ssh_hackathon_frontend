# DB 설계

연합 해커톤 웹사이트의 데이터 구조와 권한 설계. 기준: `연합해커톤_웹사이트_필수기능_v10.md` + 이후 변경(평가: 상호 평가 → 외부 심사위원).
테이블 정의: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)

## 전체 구조

```
브라우저 ──(쿠키 세션)──▶ Next.js (Vercel)
                          ├─ NextAuth: Google 로그인, 도메인 확인, 세션(JWT)
                          └─ app/api/* : 권한 확인 → Supabase (service role 키)
                                                      ├─ Postgres (테이블)
                                                      └─ Storage (제출 파일)
```

- **로그인**: NextAuth(Auth.js) + Google. 로그인 직후 `signIn` 콜백에서 이메일 도메인이 `allowed_domains`에 있거나 이메일이 `invited_emails`에 있을 때만 통과시키고, `users` 행을 만들거나 갱신한다.
- **데이터 접근**: 브라우저는 Supabase에 직접 접근하지 않는다. 모든 읽기·쓰기는 API 라우트가 service role 키로 하고, "누가 무엇을 할 수 있는지"는 서버 코드에서 확인한다.
- **RLS**: 모든 테이블에 RLS를 켜고 정책을 두지 않는다. 혹시 anon 키가 노출돼도 아무 데이터도 읽거나 쓸 수 없다.
- **service role 키는 서버 환경변수에만** 둔다 (`NEXT_PUBLIC_` 접두사 금지).

## 관계도

```mermaid
erDiagram
  users ||--o| applications : "신청 (1인 1건)"
  users ||--o| team_members : "소속 (1인 1팀)"
  teams ||--o{ team_members : "팀원"
  teams ||--o{ applications : "팀 신청"
  users ||--o{ teams : "팀장(leader_id)"
  teams ||--o| submissions : "결과물 (1팀 1건)"
  users ||--o{ scores : "심사위원"
  teams ||--o{ scores : "심사 대상"
  criteria ||--o{ scores : "평가 항목"
  teams ||--o{ awards : "수상"
  users ||--o{ email_logs : "메일 수신"
```

## 테이블

| 테이블 | 내용 | 기획서 |
|---|---|---|
| `allowed_domains` | 로그인 허용 학교 도메인 → 소속 학교 | 개요 · 기능 2 |
| `invited_emails` | 학교 계정이 아닌 초청자(심사위원·운영진) 로그인 허용 목록 | 변경 사항 |
| `users` | 계정 · 프로필(이름, 학번, 연락처, 동의) · 역할(`participant`/`judge`/`admin`) | 기능 2 |
| `event_config` | 단계별 일정, 결과 공개 여부, 팀 인원 조건 (한 행) | 기능 9 일정 관리 |
| `applications` | 참가 신청 (사람마다 1건), 선발 결과 | 기능 3 · 9 |
| `teams` | 팀 (신청한 팀 / 운영진이 구성한 팀), 참가 코드, 팀장, 발표 순서 | 기능 3 · 4 · 9 |
| `team_members` | 팀 소속 (한 사람은 한 팀에만), 팀 내 역할 | 기능 3 · 4 |
| `submissions` | 결과물 (팀마다 1건), 파일 경로, 프로토타입 링크 | 기능 5 · 6 |
| `criteria` · `scores` | 평가 항목(점수 범위·가중치), 심사위원 점수 — **점수 방식 미정** | 기능 7 (변경) |
| `awards` | 수상 내역 | 기능 8 |
| `email_logs` | 선발 결과·팀 배정 메일 발송 기록 | 메일 발송 |

## 주요 흐름

**최초 로그인**
1. Google 로그인 → 도메인/초청 목록 확인 → 없으면 차단
2. `users` 행 생성 (`school`은 도메인으로, 초청자는 `invited_emails.role`로 `role` 설정)
3. `profile_completed_at`이 비어 있으면 프로필 입력 화면으로 보낸다

**개인 신청**: `applications(kind='solo')` 작성 → 마감 전까지 수정 → 제출(`submitted`)

**팀 신청**
1. 대표가 팀 생성 → `teams(origin='applied', join_code 발급, leader_id)` + 대표의 `team_members`·`applications(kind='team')`
2. 팀원이 참가 코드로 합류 → `team_members` + 각자의 `applications(kind='team', team_id)`
3. 인원 조건(`event_config.team_min_size ~ team_max_size`) 충족 시 대표가 제출 → 팀원 전원의 `applications.status = 'submitted'`, `teams.application_submitted_at`

**선발**: 운영진이 승인/거절 → `applications.status`, `decided_at` (팀 신청은 팀원 전원 함께) → 결과 메일 일괄 발송(`email_logs`)

**팀 배정**: 운영진이 승인된 개인 참가자로 `teams(origin='assigned')`를 만들고 `team_members` 추가 → 배정 메일 발송. 배정된 팀은 팀에서 팀명 입력

**결과물 제출**: 팀장이 `submissions` 작성·수정 (마감 전까지), 팀원은 열람. 파일은 Storage `submissions` 버킷

**심사·결과**: 심사위원이 `scores` 입력 → 운영진 확인 → 수상 팀 지정(`awards`) → `event_config.results_published_at` 설정 시 공개

## 권한 (서버에서 확인)

| 기능 | 누구나 | 로그인 | 참가자(승인) | 팀장 | 심사위원 | 운영진 |
|---|---|---|---|---|---|---|
| 소개 페이지 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 내 정보 | | ✓ | ✓ | ✓ | ✓ | ✓ |
| 참가 신청 (신청 기간) | | ✓ | | | | |
| 내 팀 | | | ✓ | ✓ | | ✓ |
| 결과물 제출·수정 (마감 전) | | | | ✓ | | ✓ |
| 결과물 열람 | 결과 공개 후 | | 자기 팀 | 자기 팀 | 심사 기간 | ✓ |
| 심사 (심사 기간) | | | | | ✓ | ✓ |
| 결과 발표 | 공개 후 | | | | | ✓ |
| 관리자 | | | | | | ✓ |

## 환경변수

| 이름 | 용도 | 노출 |
|---|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 주소 | 서버 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 DB 키 | **서버만, 절대 공개 금지** |
| `AUTH_SECRET` | NextAuth 세션 암호화 | 서버 |
| `AUTH_GOOGLE_ID` · `AUTH_GOOGLE_SECRET` | Google OAuth 클라이언트 | 서버 |
| `RESEND_API_KEY` | 메일 발송 | 서버 |
| `MAIL_FROM` | 발신 주소 (예: `연합 해커톤 <noreply@도메인>`) | 서버 |

로컬은 `.env.local`(git 제외), 운영은 Vercel 프로젝트 환경변수에 넣는다.

## 결정 사항

| 항목 | 결정 |
|---|---|
| 로그인 도메인 | 한양대 `hanyang.ac.kr` · 성균관대 `g.skku.edu` · 서강대 `u.sogang.ac.kr` |
| 심사위원 로그인 | 모두 Google 계정 보유 → 운영진이 `invited_emails`에 등록 |
| 팀 인원 | 팀 신청·운영진 배정 팀 모두 2~4명 (`event_config.team_min_size`·`team_max_size`) |
| 메일 발송 | Resend (`RESEND_API_KEY`, `MAIL_FROM`) |
| 제출 파일 | 발표자료 PDF 20MB · 대표 이미지 5MB(png/jpg/webp)만 업로드. 프로토타입은 링크로만 |

## 남은 결정

1. **점수 방식** — 미정. 지금 설계는 평가 항목마다 최저·최고점(`min_score`·`max_score`)과 가중치를 둬서 1~5점, 1~10점, 항목별 배점제 어느 쪽이든 담을 수 있다. 합산 방식(가중 평균 / 합계 / 심사위원별 정규화 등)이 정해지면 결과 계산만 맞추면 된다
2. **메일 발신 도메인** — 쓸 예정이지만 미정. 정해지면 Resend에서 도메인 인증 후 `MAIL_FROM`을 그 주소로 바꾼다. 그 전에는 Resend 테스트 발신 주소로만 보낼 수 있다(본인 계정 메일로만 수신)
