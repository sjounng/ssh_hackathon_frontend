import { APPLY, PHASES } from '../content.js'

const DAY = 24 * 60 * 60 * 1000

// 신청 버튼 상태: before(오픈 전) / open(신청 중) / closed(마감)
// openAt/closeAt: 관리자 일정(DB) 값. 없으면 content.js의 APPLY 날짜를 쓴다. 한쪽이 비면 그쪽 제한은 없다
export function getApplyStatus(now = new Date(), { openAt = APPLY.open, closeAt = APPLY.close } = {}) {
  const open = openAt ? new Date(openAt) : null
  const close = closeAt ? new Date(closeAt) : null
  if (open && now < open) return { state: 'before', opensAt: open }
  if (close && now > close) return { state: 'closed' }
  return { state: 'open', dday: close ? Math.max(0, Math.ceil((close - now) / DAY)) : null }
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
