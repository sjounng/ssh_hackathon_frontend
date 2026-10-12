# 연합 해커톤 웹사이트

한양대 × 성균관대 × 서강대 연합 해커톤 메인 랜딩 페이지.

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
| `src/content.js` | **페이지의 모든 문구와 일정.** 문구 수정은 이 파일만 고치면 된다 |
| `src/Scene.jsx` | 배경 3D 장면 (빛 배경, 유리 다이아몬드, 스크롤 카메라, 관측 HUD 갱신) |
| `src/sections/` | 섹션별 컴포넌트 (Hero, About, Prizes, Eligibility, Review, Schedule, Footer) |
| `src/components/` | 공통 부품 (Header, ApplyButton, Hud, Ph, BackgroundScene) |
| `src/lib/schedule.js` | 신청 기간·현재 단계 계산 |

## 문구 채우기

- `content.js`에서 대괄호로 감싼 값(`[행사명]` 등)은 아직 정해지지 않은 자리표시다. 화면에는 대괄호째 그대로 보인다.
- 날짜 값(ISO 형식)은 신청 버튼 활성화와 일정의 "진행 중" 표시에 쓰이므로, 일정이 정해지면 함께 바꾼다.

## 3D 장면

- 3D 장면은 브라우저에서만 불러온다(`components/BackgroundScene.jsx`, `ssr: false`). 페이지 전체 뒤에 고정되어 있다. 각 섹션의 `data-diamond` 값이 짝지은 다이아몬드(유성) 번호이며, 섹션이 화면 가운데에 오면 카메라가 그 유성을 비춘다. `-1`이거나 값이 없으면 전체 모습을 보여준다.
- 전환 타이밍은 `Scene.jsx` 위쪽의 `T_OUT`, `T_HOLD`, `T_IN`, 유성이 화면에서 차지하는 비율은 `FILL`로 조절한다.
- 후처리(`EffectComposer`)에서 MSAA(`multisampling`)는 켜지 말 것. GPU에 따라 에러 없이 화면 전체가 검게 나온다.

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

### 연결 점검

```bash
npm run check:db      # Supabase 연결, 테이블·함수·버킷 확인 (키 값은 출력하지 않음)
npm run smoke:apply   # 실제 DB에서 팀 신청 흐름을 돌리고 테스트 데이터를 지움
```

### DB 규칙 테스트

참가 신청 규칙은 DB 함수(`supabase/migrations/0002_apply.sql`)에 있고, 로컬 Postgres로 시험할 수 있다.

```bash
# 빈 DB에 마이그레이션을 적용한 뒤
psql -f supabase/tests/apply_test.sql   # 끝까지 가면 'ALL APPLY TESTS PASSED'
psql -f supabase/tests/admin_test.sql   # 'ALL ADMIN TESTS PASSED' (새 DB에서)
```

## 배포

Vercel에 배포되어 있다: https://ssh-hackathon-frontend.vercel.app

- `main` 브랜치에 푸시하면 자동으로 운영 사이트에 배포된다.
- 다른 브랜치에 푸시하거나 PR을 열면 미리보기 주소가 따로 만들어진다.

## 사용 라이브러리

Next.js 16 (App Router), React, three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing
