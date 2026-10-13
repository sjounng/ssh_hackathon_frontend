'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 기준 요소(anchor) 아래(공간이 없으면 위)에 띄우는 팝업.
// 유리 카드는 clip-path로 모서리를 잘라 안쪽 팝업이 잘리므로 body에 portal로 띄우고 위치를 직접 계산한다.
export default function Popover({ anchorRef, open, onClose, children, className = '', minWidth = 'anchor', ignoreSelector }) {
  const popRef = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect()
      const p = popRef.current
      if (!a || !p) return
      const h = p.offsetHeight
      const w = p.offsetWidth
      const below = window.innerHeight - a.bottom
      const top = below < h + 12 && a.top > below ? a.top - h - 6 : a.bottom + 6
      const left = Math.min(Math.max(8, a.left), window.innerWidth - w - 8)
      // 드롭다운 버튼의 실제 둥글기(알약이면 높이의 절반)를 넘겨, 펼친 창도 같은 모양으로 맞춘다
      const r = Math.min(parseFloat(getComputedStyle(anchorRef.current).borderTopLeftRadius) || 0, a.height / 2)
      setPos({ top, left, width: minWidth === 'anchor' ? a.width : undefined, r })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef, minWidth])

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return
      if (ignoreSelector && e.target.closest?.(ignoreSelector)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose, anchorRef, ignoreSelector])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={popRef}
      className={`popover ${className}`}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, minWidth: pos?.width, '--anchor-r': pos ? `${pos.r}px` : undefined }}
    >
      {children}
    </div>,
    document.body,
  )
}
