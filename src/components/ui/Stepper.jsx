'use client'

// 숫자 입력: 브라우저 기본 위아래 화살표 대신 − / + 버튼
export default function Stepper({ value, onChange, min = 0, max = 99, ariaLabel }) {
  const n = Number(value) || 0
  const set = (v) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className="stepper" role="group" aria-label={ariaLabel}>
      <button type="button" onClick={() => set(n - 1)} disabled={n <= min} aria-label="줄이기">−</button>
      <output aria-live="polite">{n}</output>
      <button type="button" onClick={() => set(n + 1)} disabled={n >= max} aria-label="늘리기">+</button>
    </div>
  )
}
