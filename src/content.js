// 랜딩 페이지의 모든 문구.
// 문구는 이 파일만 고치면 된다. 대괄호([ ])로 감싼 값은 아직 정해지지 않은 자리표시이며,
// 화면에도 대괄호째 보이므로 교체할 곳을 쉽게 찾을 수 있다.
// 일정(날짜)과 팀 인원은 여기 두지 않는다: 관리자 페이지 > 일정(DB)에 넣으면 첫 화면의 일시·신청 버튼·
// 행사 일정·참가 자격에 그대로 보인다. 비어 있는 날짜는 '[미정]'으로 보인다.

export const EVENT = {
  name: '[행사명]',
  eyebrow: '한양대 × 성균관대 × 서강대 연합 해커톤',
  summary: '[행사를 한두 문장으로 소개하는 문구]',
  venue: '[장소]',
  capacity: '[N]명 · [N]시간',
}

// 주최 학교. 로그인 허용 도메인의 실제 기준은 DB의 allowed_domains 테이블이다 (여기 domain은 표시용)
export const HOSTS = [
  { key: 'hy', name: '한양대학교', short: '한양대', domain: '@hanyang.ac.kr' },
  { key: 'sk', name: '성균관대학교', short: '성균관대', domain: '@g.skku.edu' },
  { key: 'sg', name: '서강대학교', short: '서강대', domain: '@u.sogang.ac.kr' },
]

// 신청 버튼이 여는 주소. 버튼은 관리자 일정의 신청 시작~마감 사이에만 활성화된다
export const APPLY = {
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

// 메인 페이지 오른쪽의 페이지 표시(마름모). id는 각 섹션 요소의 id
export const LANDING_PAGES = [
  { id: 'top', label: '메인' },
  { id: 'about', label: '소개' },
  { id: 'prizes', label: '상금·혜택' },
  { id: 'eligibility', label: '참가 자격' },
  { id: 'review', label: '평가 방식' },
  { id: 'schedule', label: '일정' },
  { id: 'join', label: '참가 신청' },
]

// 기능 페이지 소개 (아직 기능이 구현되지 않은 페이지에 "준비 중"과 함께 표시)
export const PAGES = {
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
}

export const PRIZES = {
  awards: [
    { rank: '대상', amount: '[금액]', highlight: true },
    { rank: '최우수상', amount: '[금액]' },
    { rank: '우수상', amount: '[금액]' },
  ],
  benefits: ['[참가자 전원 혜택 1]', '[참가자 전원 혜택 2]', '[참가자 전원 혜택 3]'],
}

export const ELIGIBILITY = {
  intro: '주최 학교의 Google 계정으로 로그인하면 누구나 신청할 수 있습니다.',
  tracks: [
    {
      key: 'team',
      title: '팀 참가',
      badge: ({ min, max }) => `${min}~${max}명`, // 관리자 일정의 팀 인원 조건
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

// 단계별 일정. 날짜는 관리자 일정(DB event_config)의 칸에서 가져온다.
// from~to: 표시할 날짜 칸. from이 "진행 중" 표시가 시작되는 시각이다. time: 시각까지 표시
// 결과물 제출은 행사 중에 하므로 마감만 보여 주고, 그동안은 '행사'가 진행 중으로 보인다
export const PHASES = [
  { key: 'apply', label: '모집', from: 'apply_open_at', to: 'apply_close_at' },
  { key: 'select', label: '선발 발표', from: 'selection_announce_at' },
  { key: 'assign', label: '팀 배정', from: 'team_assign_at' },
  { key: 'event', label: '행사', from: 'event_start_at', to: 'event_end_at' },
  { key: 'submit', label: '결과물 제출', to: 'submit_deadline_at', time: true },
  { key: 'review', label: '심사', from: 'judging_start_at', to: 'judging_end_at' },
  { key: 'results', label: '결과 발표', from: 'results_announce_at' },
]

// 당일 타임테이블. 날짜는 관리자 일정의 행사 시작일로부터 DAY 1, DAY 2… 순서로 계산한다
export const TIMETABLE = [
  {
    day: 'DAY 1',
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
  sub: '[신청 안내 보조 문구]',
}

export const FOOTER = {
  contacts: [
    { label: '[문의 채널 1 — 예: 카카오톡 채널]', href: '#' },
    { label: '[문의 채널 2 — 예: 이메일]', href: '#' },
  ],
  privacyHref: '/privacy',
  copyright: '© [연도] [주최 단체명]',
}

// 개인정보 처리방침 (/privacy). 프로필 입력 화면의 동의 체크박스와 푸터가 이 페이지를 연결한다.
// 초안이므로 대괄호 값을 채우고, 운영 전에 주최 측(학교 담당 부서 등)의 검토를 받는다
export const PRIVACY = {
  intro: '[주최 단체명]은 연합 해커톤 운영에 필요한 최소한의 개인정보만 수집하며, 아래 목적 외에는 쓰지 않습니다.',
  // 동의를 받을 때 반드시 알려야 하는 네 가지 (개인정보 보호법 제15조 제2항)
  consent: [
    {
      title: '수집 항목',
      body: [
        '로그인·프로필: Google 계정 이메일, 이름, 학번(주최 학교 계정), 휴대폰 번호',
        '참가 신청: 희망 역할, 기술 스택, 지원 동기, 팀 정보',
        '결과물 제출: 프로젝트 정보, 발표자료·대표 이미지, 관련 링크',
        '자동 수집: 로그인 유지를 위한 쿠키, 접속 기록(IP 주소 등)',
      ],
    },
    {
      title: '이용 목적',
      body: ['본인 확인과 로그인, 참가 신청 접수와 선발, 팀 구성과 배정, 선발 결과·팀 배정 등 행사 안내 연락, 결과물 심사와 결과 발표'],
    },
    {
      title: '보유·이용 기간',
      body: ['행사 종료 후 [N개월]까지 보관한 뒤 지체 없이 파기합니다. 삭제를 요청하면 그 전이라도 파기합니다.'],
    },
    {
      title: '동의 거부 권리',
      body: ['동의하지 않을 수 있습니다. 다만 동의하지 않으면 참가 신청 등 이 사이트의 기능을 이용할 수 없습니다.'],
    },
  ],
  sections: [
    {
      title: '처리 위탁·국외 이전',
      items: [
        '사이트 운영을 위해 아래 업체에 개인정보 처리를 맡기며, 일부는 국외 서버에 저장될 수 있습니다.',
        'Supabase — 데이터베이스·파일 저장 [서버 지역]',
        'Vercel — 웹사이트 호스팅 [서버 지역]',
        'Google — 로그인',
        'Resend — 안내 메일 발송',
      ],
    },
    {
      title: '제3자 제공과 공개',
      items: [
        '개인정보를 제3자에게 제공하지 않습니다. 운영진과 심사위원은 운영·심사에 필요한 범위에서만 열람합니다.',
        '결과 발표 뒤 프로젝트 페이지에 팀명과 프로젝트 정보(프로젝트명, 소개, 대표 이미지 등)가 공개됩니다. [팀원 이름 공개 여부]',
      ],
    },
    {
      title: '정보주체의 권리',
      items: [
        '이름·연락처 등은 내 정보에서 직접 고칠 수 있습니다.',
        '개인정보의 열람, 정정, 삭제, 처리 정지를 아래 문의처로 요청할 수 있으며, 지체 없이 처리합니다.',
      ],
    },
    {
      title: '개인정보 보호 책임자',
      items: ['[담당자 이름 · 소속]', '[연락처 — 이메일]'],
    },
  ],
  effective: '[YYYY.MM.DD]',
}
