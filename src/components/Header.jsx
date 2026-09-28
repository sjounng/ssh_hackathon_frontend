import { useEffect, useState } from 'react'
import { EVENT, NAV } from '../content.js'
import Ph from './Ph.jsx'

// 공통 헤더. 로그인·운영진·평가 권한에 따른 메뉴 분기는 로그인 기능을 붙일 때 추가한다 (기획서 기능 0)
export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''} ${open ? 'open' : ''}`}>
      <a className="logo" href="#top" onClick={() => setOpen(false)}>
        <span className="dot hy" /><span className="dot sk" /><span className="dot sg" />
        <span className="logo-text"><Ph>{EVENT.name}</Ph></span>
      </a>
      <nav className="nav-links" aria-label="주요 메뉴">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>
        ))}
      </nav>
      <div className="nav-right">
        <a className="btn small ghost" href="/login">로그인</a>
        <button className="menu-btn" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span /><span />
        </button>
      </div>
    </header>
  )
}
