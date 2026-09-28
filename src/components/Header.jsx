'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EVENT, NAV } from '../content.js'
import Ph from './Ph.jsx'

// 지금 사용자에게 보여줄 메뉴 권한. 로그인 기능이 붙기 전이라 운영진 메뉴를 뺀 전체를 미리 보여준다.
// 로그인·운영진·심사위원 권한이 생기면 사용자 정보로 이 목록을 만들면 된다 (기획서 기능 0)
const VIEWER_ACCESS = ['public', 'member', 'participant', 'team', 'judge']

// 공통 헤더: 기능 페이지로 이동하는 메뉴
export default function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 페이지를 옮기면 모바일 메뉴를 닫는다
  useEffect(() => setOpen(false), [pathname])

  const items = NAV.filter((n) => VIEWER_ACCESS.includes(n.access))

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''} ${open ? 'open' : ''}`}>
      <Link className="logo" href="/">
        <span className="dot hy" /><span className="dot sk" /><span className="dot sg" />
        <span className="logo-text"><Ph>{EVENT.name}</Ph></span>
      </Link>
      <nav className="nav-links" aria-label="주요 메뉴">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`)
          return (
            <Link key={n.href} href={n.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
              {n.label}
            </Link>
          )
        })}
      </nav>
      <div className="nav-right">
        <Link className={`btn small ghost ${pathname === '/login' ? 'active' : ''}`} href="/login">로그인</Link>
        <button className="menu-btn" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span /><span />
        </button>
      </div>
    </header>
  )
}
