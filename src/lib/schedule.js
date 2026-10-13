import { PHASES } from '../content.js'

// 일정 계산·표시 (서버·브라우저 공용). 일정 값은 관리자 페이지 > 일정(DB event_config)에서 온다
const DAY = 24 * 60 * 60 * 1000
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const UNSET = '[미정]'

// 신청 버튼 상태: before(오픈 전) / open(신청 중) / closed(마감)
// 한쪽이 비면 그쪽 제한은 없다 (서버의 apply_assert_open과 같은 규칙)
export function getApplyStatus(now, { openAt, closeAt }) {
  const open = openAt ? new Date(openAt) : null
  const close = closeAt ? new Date(closeAt) : null
  if (open && now < open) return { state: 'before', opensAt: open }
  if (close && now > close) return { state: 'closed' }
  return { state: 'open', dday: close ? Math.max(0, Math.ceil((close - now) / DAY)) : null }
}

// 날짜는 행사 기준인 한국 시각으로 보여준다 (서버에서 그려도 방문자 브라우저와 같은 값이 나오게)
function kst(value) {
  const d = new Date(new Date(value).getTime() + 9 * 60 * 60 * 1000)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), w: WEEK[d.getUTCDay()], h: d.getUTCHours(), min: d.getUTCMinutes() }
}
const p2 = (n) => String(n).padStart(2, '0')

// 10.13
export function formatMonthDay(value) {
  const t = kst(value)
  return `${t.m}.${p2(t.d)}`
}

// 행사 일시: 2026.11.14 (토) – 11.15 (일)
export function formatEventDates(start, end) {
  if (!start) return UNSET
  const a = kst(start)
  const head = `${a.y}.${p2(a.m)}.${p2(a.d)} (${a.w})`
  if (!end) return head
  const b = kst(end)
  return a.y === b.y && a.m === b.m && a.d === b.d ? head : `${head} – ${p2(b.m)}.${p2(b.d)} (${b.w})`
}

// 타임테이블 n일차(0부터) 날짜: 행사 시작일 + n일 → 11.14 (토)
export function formatEventDay(start, n) {
  if (!start) return UNSET
  const t = kst(new Date(start).getTime() + n * DAY)
  return `${p2(t.m)}.${p2(t.d)} (${t.w})`
}

// 단계 날짜: from–to, from만 있으면 그 날, to만 있으면 '~ 마감'. time이면 시각까지
function formatPhaseDate(from, to, withTime) {
  const f = (v) => {
    const t = kst(v)
    return withTime ? `${t.m}.${p2(t.d)} ${p2(t.h)}:${p2(t.min)}` : `${t.m}.${p2(t.d)}`
  }
  if (from && to) return f(from) === f(to) ? f(from) : `${f(from)} – ${f(to)}`
  if (from) return f(from)
  if (to) return `~ ${f(to)}`
  return UNSET
}

// 첫 화면 행사 일정: content.js의 단계마다 DB 일정의 날짜를 붙인다. start는 "진행 중" 표시가 시작되는 시각
export function buildPhases(schedule) {
  return PHASES.map((p) => {
    const from = (p.from && schedule?.[p.from]) || null
    const to = (p.to && schedule?.[p.to]) || null
    return { ...p, start: from, date: formatPhaseDate(from, to, p.time) }
  })
}

// 지금 진행 중인 단계의 인덱스. 첫 단계 전이면 -1
export function getCurrentPhase(phases, now = new Date()) {
  let current = -1
  phases.forEach((p, i) => {
    if (p.start && new Date(p.start) <= now) current = i
  })
  return current
}
