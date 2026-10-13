'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 브라우저 기본 confirm() 대신 쓰는 확인 대화상자.
// const [dialog, confirm] = useConfirm()  →  if (await confirm('팀에서 나갈까요?')) …  →  JSX에 {dialog}
export default function useConfirm() {
  const [req, setReq] = useState(null)
  const confirm = useCallback(
    (message, { ok = '확인', cancel = '취소', danger = false } = {}) =>
      new Promise((resolve) => setReq({ message, ok, cancel, danger, resolve })),
    [],
  )
  const done = (v) => {
    req?.resolve(v)
    setReq(null)
  }
  const dialog = req ? <ConfirmDialog {...req} onDone={done} /> : null
  return [dialog, confirm]
}

function ConfirmDialog({ message, ok, cancel, danger, onDone }) {
  const okRef = useRef(null)
  useEffect(() => {
    okRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onDone(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onDone(false)}>
      <div className="dialog glass" role="alertdialog" aria-modal="true" aria-label={message}>
        <p>{message}</p>
        <div className="actions">
          <button className="btn ghost" type="button" onClick={() => onDone(false)}>{cancel}</button>
          <button ref={okRef} className={`btn primary ${danger ? 'danger' : ''}`} type="button" onClick={() => onDone(true)}>{ok}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
