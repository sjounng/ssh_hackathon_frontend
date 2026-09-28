// 랜딩 페이지의 모든 문구와 일정 설정.
// 문구는 이 파일만 고치면 된다. 대괄호([ ])로 감싼 값은 아직 정해지지 않은 자리표시이며,
// 화면에서 점선 밑줄로 표시되어 교체할 곳을 쉽게 찾을 수 있다.
// 날짜 값(ISO 형식)은 신청 버튼 활성화와 "현재 단계" 표시에 쓰이므로 실제 일정이 정해지면 함께 바꾼다.

export const EVENT = {
  name: '[행사명]',
  eyebrow: '한양대 × 성균관대 × 서강대 연합 해커톤',
  headline: ['Three schools,', 'one light.'], // 두 번째 줄은 외곽선 글씨로 표시된다
  summary: '[행사를 한두 문장으로 소개하는 문구]',
  date: '[YYYY.MM.DD (요일) – MM.DD (요일)]',
  venue: '[장소]',
}

// 주최 학교. domain이 null이면 "확정 예정"으로 표시된다 (기획서 개요 > 로그인 허용 Google 계정)
export const HOSTS = [
  { key: 'hy', name: '한양대학교', short: '한양대', domain: '@hanyang.ac.kr' },
  { key: 'sk', name: '성균관대학교', short: '성균관대', domain: null },
  { key: 'sg', name: '서강대학교', short: '서강대', domain: null },
]

// 신청 기간: 이 기간 안에만 신청 버튼이 활성화된다 [임시 날짜]
export const APPLY = {
  open: '2026-10-13T00:00:00+09:00',
  close: '2026-10-27T23:59:59+09:00',
  href: '/apply',
}

// 헤더 메뉴: 기능 페이지로 이동한다 (기획서 기능 맵).
// access는 기획서의 "사용자" 열: 로그인 기능을 붙이면 Header에서 이 값으로 메뉴를 걸러낸다.
//   public: 누구나 · member: 로그인 사용자 · participant: 참가자 · team: 팀 · judge: 심사위원 · admin: 운영진
export const NAV = [
  { href: '/apply', label: '참가 신청', access: 'member' },
  { href: '/team', label: '내 팀', access: 'participant' },
  { href: '/submit', label: '결과물 제출', access: 'team' },
  { href: '/projects', label: '프로젝트', access: 'public' },
  { href: '/review', label: '심사', access: 'judge' },
  { href: '/results', label: '결과 발표', access: 'public' },
  { href: '/admin', label: '관리자', access: 'admin' },
]

// 기능 페이지 소개 (아직 기능이 구현되지 않은 페이지에 "준비 중"과 함께 표시)
export const PAGES = {
  login: {
    code: 'LOGIN',
    title: '로그인',
    desc: '주최 학교 Google 계정으로 로그인합니다. 계정 도메인으로 소속 학교를 확인합니다.',
    items: ['학교 Google 계정 로그인 (허용 도메인이 아니면 차단)', '최초 로그인 시 프로필 입력 — 이름, 학번, 연락처, 필수 동의'],
  },
  me: {
    code: 'ME',
    title: '내 정보',
    desc: '내 정보를 확인·수정하고 신청 상태를 확인합니다.',
    items: ['내 정보 조회·수정', '신청 상태 확인 — 제출 완료 / 승인 / 거절'],
  },
  apply: {
    code: 'APPLY',
    title: '참가 신청',
    desc: '개인 또는 팀으로 신청합니다. 신청 마감 전까지 수정할 수 있습니다.',
    items: ['개인 참가 — 희망 역할, 기술 스택, 지원 동기', '팀 참가 — 대표가 팀 신청을 만들고 참가 코드 발급', '팀원은 참가 코드로 합류해 각자 역할 작성 (2~4명)'],
  },
  team: {
    code: 'TEAM',
    title: '내 팀',
    desc: '팀명과 팀원을 확인합니다. 개인 참가자는 팀 배정 발표 후 팀이 표시됩니다.',
    items: ['팀명, 팀원 목록 (이름, 학교, 역할, 팀장 표시)', '개인 참가자는 배정 전 "배정 대기 중" 표시', '배정된 팀은 팀명 입력'],
  },
  submit: {
    code: 'SUBMIT',
    title: '결과물 제출',
    desc: '팀장이 결과물을 제출하고 마감 전까지 수정합니다. 제출한 프로젝트가 심사 대상이 됩니다.',
    items: ['프로젝트명, 한 줄 소개, 상세 설명, 대표 이미지', '필수 — 서비스 프로토타입, 발표자료(PDF), GitHub 저장소', '선택 — 시연 영상, 배포 링크'],
  },
  projects: {
    code: 'PROJECTS',
    title: '프로젝트',
    desc: '제출된 프로젝트를 모아 봅니다. 결과 발표 후에는 누구에게나 공개됩니다. [심사 기간 중 공개 범위]',
    items: ['갤러리 — 대표 이미지, 프로젝트명, 팀명, 한 줄 소개, 수상 표시', '상세 — 팀원, 상세 설명, 제출물, 수상 내역'],
  },
  review: {
    code: 'JUDGING',
    title: '심사',
    desc: '초청한 외부 심사위원이 제출된 프로젝트를 심사합니다. 세부 방식은 기획 확정 후 정리합니다.',
    items: ['심사 대상 프로젝트 목록', '[평가 항목별 점수 입력 방식]', '[심사위원 계정과 접근 방식]'],
  },
  results: {
    code: 'RESULTS',
    title: '결과 발표',
    desc: '운영진 확인을 거쳐 순위와 수상 팀을 공개합니다.',
    items: ['[심사 점수로 순위 산출 — 방식 확정 후 기입]', '수상 팀과 프로젝트 페이지 연결'],
  },
  admin: {
    code: 'ADMIN',
    title: '관리자',
    desc: '운영진 전용 페이지입니다.',
    items: ['신청 관리 · 팀 배정 · 팀 관리', '제출 관리 · 평가 관리 · 결과 관리', '일정 관리 · 운영진 지정'],
  },
}

export const ABOUT = {
  title: '[행사 소개 제목]',
  body: [
    '[행사 소개 첫 문단 — 어떤 해커톤인지, 왜 세 학교가 함께하는지]',
    '[행사 소개 둘째 문단 — 참가자가 경험하게 될 것]',
  ],
  topic: {
    label: '주제',
    title: '[해커톤 주제]',
    desc: '[주제 설명 — 어떤 문제를 풀면 되는지]',
  },
  stats: [
    { value: '3', label: '주최 학교' },
    { value: '[N]', label: '모집 인원' },
    { value: '[N]시간', label: '해커톤 진행' },
  ],
}

export const PRIZES = {
  awards: [
    { rank: '대상', amount: '[금액]', count: '[N]팀', highlight: true },
    { rank: '최우수상', amount: '[금액]', count: '[N]팀' },
    { rank: '우수상', amount: '[금액]', count: '[N]팀' },
  ],
  benefits: ['[참가자 전원 혜택 1]', '[참가자 전원 혜택 2]', '[참가자 전원 혜택 3]'],
}

export const ELIGIBILITY = {
  intro: '주최 학교의 Google 계정으로 로그인하면 누구나 신청할 수 있습니다. 로그인한 계정의 도메인으로 소속 학교를 확인합니다.',
  tracks: [
    {
      key: 'team',
      title: '팀 참가',
      badge: '2~4명',
      steps: [
        '팀 대표가 팀 신청을 만들고 참가 코드를 받습니다.',
        '팀원들이 참가 코드로 합류해 각자 역할을 작성합니다.',
        '인원 조건을 채우면 대표가 팀 단위로 제출합니다.',
      ],
      result: '신청한 팀 그대로 선발됩니다.',
    },
    {
      key: 'solo',
      title: '개인 참가',
      badge: '1명',
      steps: [
        '혼자 신청서를 작성합니다.',
        '희망 역할, 기술 스택, 지원 동기를 적습니다.',
        '선발되면 운영진이 팀을 배정합니다.',
      ],
      result: '배정된 팀은 메일로 안내합니다.',
    },
  ],
  notes: [
    '선발 결과는 승인 또는 거절로만 안내하며, 신청자 전원에게 메일로 보냅니다.',
    '신청 내용은 마감 전까지 수정할 수 있습니다.',
    '행사가 시작되기 전 모든 참가자는 팀에 속하며, 제출·평가·수상은 팀 단위로 진행합니다.',
  ],
}

// 평가 방식: 외부 심사위원 심사로 변경됨 (상호 평가 폐기). 세부 방식은 기획 확정 후 채운다
export const REVIEW = {
  intro: '초청한 외부 심사위원이 제출된 프로젝트를 심사합니다.',
  principles: [
    { title: '외부 심사위원', desc: '[초청 심사위원 구성 — 예: 현업 개발자, 기업 관계자, 교수진]' },
    { title: '심사 대상', desc: '결과물을 제출한 팀의 프로젝트를 심사합니다. [발표·시연 등 심사 진행 방식]' },
    { title: '평가 항목', desc: '심사위원이 정해진 평가 항목에 따라 점수를 매깁니다. [점수 척도]' },
    { title: '순위 결정', desc: '[심사 점수 합산 방식과 동점 처리 기준]' },
  ],
  // 평가 항목과 비중
  criteria: [
    { name: '[평가 항목 1]', weight: '[00]%' },
    { name: '[평가 항목 2]', weight: '[00]%' },
    { name: '[평가 항목 3]', weight: '[00]%' },
    { name: '[평가 항목 4]', weight: '[00]%' },
  ],
}

// 단계별 일정. start는 "현재 단계" 표시에 쓰인다 [임시 날짜]
export const PHASES = [
  { key: 'apply', label: '모집', date: '[10.13 – 10.27]', start: '2026-10-13T00:00:00+09:00' },
  { key: 'select', label: '선발 발표', date: '[10.31]', start: '2026-10-31T00:00:00+09:00' },
  { key: 'assign', label: '팀 배정', date: '[11.03]', start: '2026-11-03T00:00:00+09:00' },
  { key: 'event', label: '행사', date: '[11.14 – 11.15]', start: '2026-11-14T00:00:00+09:00' },
  { key: 'submit', label: '결과물 제출', date: '[11.15 12:00]', start: '2026-11-15T09:00:00+09:00' },
  { key: 'review', label: '심사', date: '[11.15 – 11.17]', start: '2026-11-15T12:00:00+09:00' },
  { key: 'results', label: '결과 발표', date: '[11.20]', start: '2026-11-20T00:00:00+09:00' },
]

export const TIMETABLE = [
  {
    day: 'DAY 1',
    date: '[MM.DD (요일)]',
    rows: [
      { time: '[10:00]', title: '[체크인]' },
      { time: '[10:30]', title: '[개회식 · 주제 발표]' },
      { time: '[11:00]', title: '[해커톤 시작]' },
      { time: '[18:00]', title: '[저녁 식사]' },
      { time: '[22:00]', title: '[중간 점검]' },
    ],
  },
  {
    day: 'DAY 2',
    date: '[MM.DD (요일)]',
    rows: [
      { time: '[08:00]', title: '[아침 식사]' },
      { time: '[12:00]', title: '[결과물 제출 마감]' },
      { time: '[13:00]', title: '[프로젝트 발표]' },
      { time: '[15:00]', title: '[심사]' },
      { time: '[17:00]', title: '[폐회]' },
    ],
  },
]

export const CTA = {
  title: '[신청을 유도하는 마무리 문구]',
  sub: '주최 학교 Google 계정만 있으면 바로 신청할 수 있습니다.',
}

export const FOOTER = {
  contacts: [
    { label: '[문의 채널 1 — 예: 카카오톡 채널]', href: '#' },
    { label: '[문의 채널 2 — 예: 이메일]', href: '#' },
  ],
  privacyHref: '/privacy',
  copyright: '© [연도] [주최 단체명]',
}
