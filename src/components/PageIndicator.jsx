'use client'

import { useEffect, useState } from 'react'
import { LANDING_PAGES } from '../content.js'

// 메인 페이지 오른쪽 가운데의 페이지 표시: 페이지마다 마름모 하나, 지금 보는 페이지는 채워서 빛난다.
// 누르면 그 페이지 가운데로 이동한다(페이지 단위 스크롤과 같은 위치).
// 첫 화면에서는 네브바가 그 역할을 하므로 숨기고, 두 번째 페이지부터 서서히 나타난다.
export default function PageIndicator() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const mid = window.innerHeight / 2
      let current = 0
      LANDING_PAGES.forEach((p, i) => {
        const el = document.getElementById(p.id)
        if (el && el.getBoundingClientRect().top <= mid) current = i
      })
      setActive(current)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <nav className={`page-indicator ${active === 0 ? 'on-first' : ''}`} aria-label="페이지 이동">
      {LANDING_PAGES.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className={`pi-dot ${i === active ? 'active' : ''}`}
          aria-label={p.label}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => go(p.id)}
        >
          <i />
          <span className="pi-label mono">{String(i + 1).padStart(2, '0')} {p.label}</span>
        </button>
      ))}
    </nav>
  )
}
