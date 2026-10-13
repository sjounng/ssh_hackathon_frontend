// 프로필 입력 검증 (서버 API에서 사용, DB와 무관한 순수 함수라 따로 둔다)
const PHONE = /^01[016789]-?\d{3,4}-?\d{4}$/

export function validateProfile(input, { needsStudentId }) {
  const errors = {}
  const name = String(input.name ?? '').trim()
  const studentId = String(input.studentId ?? '').trim()
  const phoneRaw = String(input.phone ?? '').trim()

  if (!name || name.length > 30) errors.name = '이름을 30자 이내로 입력해 주세요.'
  if (needsStudentId && !/^\d{6,12}$/.test(studentId)) errors.studentId = '학번을 숫자로 입력해 주세요.'
  if (!PHONE.test(phoneRaw)) errors.phone = '휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.'
  if (input.privacyAgreed !== true) errors.privacyAgreed = '개인정보 수집·이용에 동의해야 합니다.'

  return { errors, values: { name, student_id: needsStudentId ? studentId : null, phone: formatPhone(phoneRaw) } }
}

// 하이픈 유무와 상관없이 010-1234-5678 / 011-123-4567 형태로 맞춘다
export function formatPhone(raw) {
  const d = String(raw).replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return raw
}
