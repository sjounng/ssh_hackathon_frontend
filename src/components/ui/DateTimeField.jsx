'use client'

import { useCallback, useRef, useState } from 'react'
import Popover from './Popover.jsx'
import Select from './Select.jsx'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, h) => [h, `${pad(h)}시`])
const MINUTES = Array.from({ length: 12 }, (_, i) => [i * 5, `${pad(i * 5)}분`])

// 'YYYY-MM-DDTHH:mm' (브라우저 현지 시각) ↔ 부분 값
const parse = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v ?? '')
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +m[4], mi: +m[5] } : null
}
const compose = ({ y, mo, d, h, mi }) => `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(mi)}`

// 브라우저 기본 날짜·시간 입력 대신 쓰는 달력 + 시간 선택 팝업
export default function DateTimeField({ value, onChange, placeholder = '설정 안 함', ariaLabel }) {
  const cur = parse(value)
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => ({ y: cur?.y ?? today.getFullYear(), mo: cur?.mo ?? today.getMonth() }))
  const btnRef = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  const first = new Date(view.y, view.mo, 1).getDay()
  const days = new Date(view.y, view.mo + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const shift = (d) => setView(({ y, mo }) => {
    const t = new Date(y, mo + d, 1)
    return { y: t.getFullYear(), mo: t.getMonth() }
  })
  const pickDay = (d) => onChange(compose({ y: view.y, mo: view.mo, d, h: cur?.h ?? 9, mi: cur?.mi ?? 0 }))
  const setTime = (part, v) => cur && onChange(compose({ ...cur, [part]: v }))

  const label = cur
    ? `${cur.y}.${pad(cur.mo + 1)}.${pad(cur.d)} (${WEEK[new Date(cur.y, cur.mo, cur.d).getDay()]}) ${pad(cur.h)}:${pad(cur.mi)}`
    : placeholder

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`select-trigger date-trigger ${open ? 'open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (!open && cur) setView({ y: cur.y, mo: cur.mo })
          setOpen((o) => !o)
        }}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        <span className={cur ? 'mono' : 'placeholder'}>{label}</span>
        <svg className="chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="3" width="10" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M2 6h10M5 1.8v2.4M9 1.8v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
      </button>
      <Popover anchorRef={btnRef} open={open} onClose={close} className="date-pop" minWidth="auto" ignoreSelector=".select-pop">
        <div role="dialog" aria-label={ariaLabel} onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }}>
          <div className="cal-head">
            <button type="button" onClick={() => shift(-1)} aria-label="이전 달">‹</button>
            <span>{view.y}년 {view.mo + 1}월</span>
            <button type="button" onClick={() => shift(1)} aria-label="다음 달">›</button>
          </div>
          <div className="cal-grid">
            {WEEK.map((w) => <span key={w} className="cal-week">{w}</span>)}
            {cells.map((d, i) => d === null ? <span key={`e${i}`} /> : (
              <button
                key={d}
                type="button"
                className={`${cur && cur.y === view.y && cur.mo === view.mo && cur.d === d ? 'selected' : ''} ${today.getFullYear() === view.y && today.getMonth() === view.mo && today.getDate() === d ? 'today' : ''}`}
                onClick={() => pickDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="cal-time">
            <Select value={cur?.h ?? 9} onChange={(v) => setTime('h', v)} options={HOURS} disabled={!cur} size="small" ariaLabel="시" />
            <Select value={cur ? Math.round(cur.mi / 5) * 5 % 60 : 0} onChange={(v) => setTime('mi', v)} options={MINUTES} disabled={!cur} size="small" ariaLabel="분" />
          </div>
          <div className="cal-actions">
            <button type="button" className="btn small ghost" onClick={() => { onChange(''); setOpen(false) }}>지우기</button>
            <button type="button" className="btn small primary" onClick={() => setOpen(false)}>완료</button>
          </div>
        </div>
      </Popover>
    </>
  )
}
