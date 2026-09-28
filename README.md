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

- `content.js`에서 대괄호로 감싼 값(`[행사명]` 등)은 아직 정해지지 않은 자리표시다. 화면에는 점선 밑줄로 표시된다.
- 날짜 값(ISO 형식)은 신청 버튼 활성화와 일정의 "진행 중" 표시에 쓰이므로, 일정이 정해지면 함께 바꾼다.

## 3D 장면

- 3D 장면은 브라우저에서만 불러온다(`components/BackgroundScene.jsx`, `ssr: false`). 페이지 전체 뒤에 고정되어 있다. 각 섹션의 `data-diamond` 값이 짝지은 다이아몬드(유성) 번호이며, 섹션이 화면 가운데에 오면 카메라가 그 유성을 비춘다. `-1`이거나 값이 없으면 전체 모습을 보여준다.
- 전환 타이밍은 `Scene.jsx` 위쪽의 `T_OUT`, `T_HOLD`, `T_IN`, 유성이 화면에서 차지하는 비율은 `FILL`로 조절한다.
- 후처리(`EffectComposer`)에서 MSAA(`multisampling`)는 켜지 말 것. GPU에 따라 에러 없이 화면 전체가 검게 나온다.

## 배포

Vercel에 배포되어 있다. `main` 브랜치에 푸시하면 자동으로 다시 배포된다(GitHub 연동 시).

## 사용 라이브러리

Next.js 16 (App Router), React, three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing
