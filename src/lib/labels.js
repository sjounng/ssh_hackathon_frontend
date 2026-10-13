// 화면에 보여줄 이름 (서버·브라우저 공용)
export const SCHOOL_LABEL = { hanyang: '한양대학교', skku: '성균관대학교', sogang: '서강대학교' }
export const SCHOOL_SHORT = { hanyang: '한양대', skku: '성균관대', sogang: '서강대' }

export const APPLICATION_STATUS_LABEL = {
  draft: '작성 중',
  submitted: '제출 완료',
  approved: '승인',
  rejected: '거절',
}

// 2026.11.15 (일) 12:00 — 브라우저 현지 시각
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export function formatDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} (${WEEK[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`
}
