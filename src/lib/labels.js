// 화면에 보여줄 이름 (서버·브라우저 공용)
export const SCHOOL_LABEL = { hanyang: '한양대학교', skku: '성균관대학교', sogang: '서강대학교' }
export const SCHOOL_SHORT = { hanyang: '한양대', skku: '성균관대', sogang: '서강대' }

export const APPLICATION_STATUS_LABEL = {
  draft: '작성 중',
  submitted: '제출 완료',
  approved: '승인',
  rejected: '거절',
}

// 2026.11.15 (일) 12:00 — 행사 기준인 한국 시각. 서버(UTC)에서 먼저 그려도 브라우저와 같은 값이 나오게 한다
export { formatKstDateTime as formatDateTime } from './schedule.js'
