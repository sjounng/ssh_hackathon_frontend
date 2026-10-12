'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Popover from './Popover.jsx'

// 브라우저 기본 <select> 대신 쓰는 드롭다운.
// options: [{ value, label }] 또는 [[value, label]]. 키보드: ↑↓ 이동, Enter·Space 선택, Esc 닫기
export default function Select({ value, onChange, options, placeholder = '선택', disabled, ariaLabel, size, className = '' }) {
  const opts = options.map((o) => (Array.isArray(o) ? { value: o[0], label: o[1] } : o))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const btnRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()
  const current = opts.find((o) => o.value === value)

  const close = useCallback(() => setOpen(false), [])
  const openList = () => {
    if (disabled) return
    setActive(Math.max(0, opts.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const pick = (o) => {
    setOpen(false)
    btnRef.current?.focus()
    if (o.value !== value) onChange(o.value)
  }

  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  // 선택 항목이 보이도록 스크롤
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(opts.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (opts[active]) pick(opts[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.stopPropagation(); setOpen(false); btnRef.current?.focus() }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`select-trigger ${size === 'small' ? 'small' : ''} ${open ? 'open' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
        }}
      >
        <span className={current ? '' : 'placeholder'}>{current?.label ?? placeholder}</span>
        <svg className="chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <Popover anchorRef={btnRef} open={open} onClose={close} className="select-pop">
        <ul ref={listRef} id={id} role="listbox" tabIndex={-1} aria-activedescendant={`${id}-${active}`} onKeyDown={onListKey}>
          {opts.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`${i === active ? 'active' : ''} ${o.value === value ? 'selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
            >
              {o.label}
              {o.value === value && <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m3 7.5 2.5 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </li>
          ))}
        </ul>
      </Popover>
    </>
  )
}
