// 랜딩 페이지의 모든 문구. 기준: 「2027 서성한 연합 해커톤 행사 기획서」(2026-10-13판)
// 문구는 이 파일만 고치면 된다. 대괄호([ ])로 감싼 값은 아직 정해지지 않은 자리표시이며,
// 화면에도 대괄호째 보이므로 교체할 곳을 쉽게 찾을 수 있다.
// 일정(날짜)과 팀 인원은 여기 두지 않는다: 관리자 페이지 > 일정(DB)에 넣으면 첫 화면의 일시·신청 버튼·
// 행사 일정·참가 자격에 그대로 보인다. 비어 있는 날짜는 '[미정]'으로 보인다.

export const EVENT = {
  name: '2027 서성한 연합 해커톤',
  eyebrow: 'FORIF × CoMit × INSIGHT',
  summary: '세 학교 학생들이 팀을 이루어 하루 동안 서비스를 기획하고 MVP(최소 기능 제품)를 개발한 뒤, 결과물을 발표하고 심사를 받는 연합 해커톤입니다.',
  venue: '한양대학교 IT/BT관 508호',
  capacity: '100명 내외 · 13시간',
}

// 주최 학교와 동아리. 로그인 허용 도메인의 실제 기준은 DB의 allowed_domains 테이블이다 (여기 domain은 표시용)
export const HOSTS = [
  { key: 'hy', name: '한양대학교', short: '한양대', club: 'FORIF', domain: '@hanyang.ac.kr' },
  { key: 'sk', name: '성균관대학교', short: '성균관대', club: 'CoMit', domain: '@g.skku.edu' },
  { key: 'sg', name: '서강대학교', short: '서강대', club: 'INSIGHT', domain: '@u.sogang.ac.kr' },
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

// 프로젝트 갤러리 (/projects). 결과 공개 전에는 심사위원(심사 시작 뒤)·운영진·자기 팀만 본다
export const PROJECTS = {
  title: '프로젝트',
  desc: '2027 서성한 연합 해커톤에서 팀들이 하루 동안 만든 프로젝트입니다.',
}

// 결과 발표 (/results). 운영진이 관리자 > 결과에서 공개하면 수상 팀이 보이고, 프로젝트 갤러리도 함께 열린다
export const RESULTS = {
  title: '결과 발표',
  desc: '2027 서성한 연합 해커톤 수상 팀입니다. 모든 팀의 프로젝트는 프로젝트 페이지에서 볼 수 있습니다.',
}

export const ABOUT = {
  title: '서성한이 함께 만드는 하루',
  body: [
    '‘서성한’으로 함께 불리는 서강대·성균관대·한양대의 학생들이 한자리에 모여 아이디어와 기술을 나눕니다. 세 학교의 프로그래밍 동아리 FORIF, CoMit, INSIGHT가 함께 주최합니다.',
    '팀을 이루어 아이디어 기획부터 설계, 개발, 발표까지 프로젝트의 전 과정을 직접 이끌어 봅니다. 하루 동안 완성한 결과물과 개발 과정은 포트폴리오로 남고, 다른 학교 참가자들과의 교류는 행사 뒤에도 이어집니다.',
  ],
  topic: {
    label: '주제',
    title: '당일 공개',
    desc: '주제는 행사 당일 OT에서 발표합니다. 제한된 시간 안에 그 주제의 문제를 풀고, 핵심 기능을 갖춘 MVP를 만들어 발표합니다.',
  },
}

// 시상. title은 관리자 > 결과의 '순위대로 채우기'에서 수상명으로도 쓴다 (위에서부터 1위, 2위…)
export const PRIZES = {
  awards: [
    { title: '대상', count: '1팀', amount: '[금액]', highlight: true },
    { title: '최우수상', count: '1팀', amount: '[금액]' },
    { title: '우수상', count: '1팀', amount: '[금액]' },
  ],
  note: '수상 팀에는 상금과 부상을 드립니다. 후원사 특별상은 후원사가 정해지면 공개합니다.',
  benefits: [
    '하루 만에 기획부터 개발, 발표까지 — 포트폴리오로 남는 프로젝트',
    '세 학교 개발자들과의 교류와 네트워크',
    '[식사 등 참가자 전원 제공 항목]',
  ],
}

export const ELIGIBILITY = {
  intro: '한양대·성균관대·서강대 재학생과 휴학생이라면 전공·학년과 관계없이 신청할 수 있습니다. 학교 Google 계정으로 로그인해 신청합니다.',
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
    '참가비는 20,000원입니다. [납부 방법과 시기]',
    '선발 결과는 승인 또는 거절로만 안내하며, 신청자 전원에게 메일로 보냅니다.',
    '신청 내용은 마감 전까지 수정할 수 있습니다.',
    '행사가 시작되기 전 모든 참가자는 팀에 속하며, 제출·평가·수상은 팀 단위로 진행합니다.',
  ],
}

// 평가 방식: 외부 심사위원 심사로 변경됨 (상호 평가 폐기). 세부 방식은 기획 확정 후 채운다
export const REVIEW = {
  intro: '초청한 외부 심사위원이 제출된 프로젝트를 심사합니다.',
  principles: [
    { title: '외부 심사위원', desc: '[초청 심사위원 구성 — 예: 현업 개발자, 후원사 관계자]' },
    { title: '심사 대상', desc: '결과물을 최종 제출한 팀의 프로젝트를 심사합니다. 제출이 끝나면 팀별로 결과물을 발표하고, 심사위원이 발표를 보고 심사합니다.' },
    { title: '평가 항목', desc: '심사위원이 아래 평가 항목마다 점수를 매깁니다. {scale}' }, // {scale}: 관리자가 정한 항목의 점수 범위
    { title: '순위 결정', desc: '[심사 점수 합산 방식과 동점 처리 기준]' },
  ],
  // 평가 항목과 비중은 관리자 > 심사에서 정한다. 아직 없을 때 보이는 자리표시
  criteriaPending: '[평가 항목 — 관리자 페이지 > 심사에서 정하면 여기에 보입니다]',
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

// 당일 타임테이블 (무박 1일). 날짜는 관리자 일정의 행사 시작일로부터 첫째 날, 둘째 날… 순서로 계산한다
export const TIMETABLE = [
  {
    day: 'D-DAY',
    rows: [
      { time: '09:00', title: 'OT — 행사 소개, 진행 규칙과 주제 안내' },
      { time: '10:00', title: '1차 개발 — 팀별 기획과 개발' },
      { time: '12:00', title: '점심 식사와 휴식' },
      { time: '13:00', title: '2차 개발' },
      { time: '18:00', title: '저녁 식사와 휴식' },
      { time: '19:50', title: '결과물 최종 제출' },
      { time: '20:00', title: '팀별 결과물 발표와 심사' },
      { time: '21:30', title: '시상식 · 폐회식' },
    ],
  },
]

export const CTA = {
  title: '세 학교와 함께, 하루 만에 만들어 보세요',
  sub: '팀으로도, 혼자서도 신청할 수 있습니다. 혼자 신청하면 운영진이 팀을 배정합니다.',
}

export const FOOTER = {
  contacts: [
    { label: 'contact@forif.org', href: 'mailto:contact@forif.org' },
    { label: '[인스타그램 계정]', href: '#' },
  ],
  privacyHref: '/privacy',
  copyright: '© 2026 FORIF · CoMit · INSIGHT',
}

// 개인정보 처리방침 (/privacy). 프로필 입력 화면의 동의 체크박스와 푸터가 이 페이지를 연결한다.
// 초안이므로 대괄호 값을 채우고, 운영 전에 주최 측(학교 담당 부서 등)의 검토를 받는다
export const PRIVACY = {
  intro: '2027 서성한 연합 해커톤 운영진(한양대학교 FORIF · 성균관대학교 CoMit · 서강대학교 INSIGHT)은 행사 운영에 필요한 최소한의 개인정보만 수집하며, 아래 목적 외에는 쓰지 않습니다.',
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
        'Vercel — 웹사이트 호스팅 (미국)',
        'Google — 로그인',
        'Resend — 안내 메일 발송 (일본)',
      ],
    },
    {
      title: '제3자 제공과 공개',
      items: [
        '개인정보를 제3자에게 제공하지 않습니다. 운영진과 심사위원은 운영·심사에 필요한 범위에서만 열람합니다.',
        '결과 발표 뒤 프로젝트 페이지에 팀명, 팀원 이름·소속 학교·팀 안 역할, 제출한 결과물(프로젝트 소개, 대표 이미지, 발표자료, 관련 링크)이 공개됩니다.',
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
      items: ['[담당자 이름 · 소속]', '이메일: contact@forif.org'],
    },
  ],
  effective: '[YYYY.MM.DD]',
}

// 안내 메일 문구 (관리자 페이지 > 메일에서 발송). 중괄호 값은 보낼 때 채워진다:
//   {event} 행사명 · {name} 받는 사람 이름 · {team} '○○ 팀' (이름이 없으면 '새 팀')
//   {eventDates} 행사 일시 · {teamAssignAt} 팀 배정 발표 시각 (일정이 비어 있으면 '추후')
//   {members} 팀원 목록 — 한 줄에 한 명씩, 문단 하나를 통째로 차지해야 한다
// 대괄호 자리표시([ ])가 남아 있으면 일괄 발송을 막는다 (나에게 테스트 발송은 된다)
export const MAIL = {
  footer: ['이 메일은 {event} 참가 신청자에게 보내는 안내입니다. 문의: contact@forif.org'],
  approvedSolo: {
    subject: '{event} 선발 결과 안내',
    body: [
      '{name}님, {event}에 선발되신 것을 축하드립니다.',
      '개인으로 신청하셨으므로 운영진이 팀을 배정합니다. 배정 결과는 {teamAssignAt}에 메일과 사이트의 내 팀 페이지로 알려 드립니다.',
      '행사 일시: {eventDates}',
    ],
    action: { label: '내 정보 보기', path: '/me' },
  },
  approvedTeam: {
    subject: '{event} 선발 결과 안내',
    body: [
      '{name}님, {team}이 {event}에 선발되신 것을 축하드립니다.',
      '팀 정보와 결과물 제출은 사이트의 내 팀 페이지에서 확인할 수 있습니다.',
      '행사 일시: {eventDates}',
    ],
    action: { label: '내 팀 보기', path: '/team' },
  },
  rejected: {
    subject: '{event} 선발 결과 안내',
    body: [
      '{name}님, {event}에 관심을 가지고 신청해 주셔서 감사합니다.',
      '아쉽게도 이번에는 함께하지 못하게 되었습니다. 많은 분이 신청해 주셔서 모든 분을 모시지 못한 점 양해 부탁드립니다.',
      '다음 행사에서 다시 뵙기를 바랍니다.',
    ],
  },
  assignment: {
    subject: '{event} 팀 배정 안내',
    body: [
      '{name}님은 {team}에 배정되었습니다. 팀원은 다음과 같습니다.',
      '{members}',
      '행사 전에 팀원들과 미리 인사를 나눠 보세요. 팀명이 아직 없다면 내 팀 페이지에서 정할 수 있습니다.',
      '행사 일시: {eventDates}',
    ],
    action: { label: '내 팀 보기', path: '/team' },
  },
}
