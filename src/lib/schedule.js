import { APPLY, PHASES } from '../content.js'

const DAY = 24 * 60 * 60 * 1000

// 신청 버튼 상태: before(오픈 전) / open(신청 중) / closed(마감)
export function getApplyStatus(now = new Date()) {
  const open = new Date(APPLY.open)
  const close = new Date(APPLY.close)
  if (now < open) return { state: 'before', opensAt: open }
  if (now > close) return { state: 'closed' }
  return { state: 'open', dday: Math.max(0, Math.ceil((close - now) / DAY)) }
}

// 지금 진행 중인 단계의 인덱스. 첫 단계 전이면 -1
export function getCurrentPhase(now = new Date()) {
  let current = -1
  PHASES.forEach((p, i) => {
    if (new Date(p.start) <= now) current = i
  })
  return current
}

export function formatMonthDay(date) {
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`
}
