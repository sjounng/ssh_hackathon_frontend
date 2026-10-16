'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EVENT, HOSTS, NAV } from '../content.js'
import Ph from './Ph.jsx'

// 사용자별 메뉴 권한 (기획서 기능 0). 비로그인에게도 '참가 신청'은 보여주고, 누르면 로그인으로 이어진다.
// 참가자 세부 단계(승인·팀 소속)에 따른 분기는 해당 기능을 만들 때 좁힌다
function accessFor(user) {
  if (!user) return ['public', 'member']
  if (user.role === 'admin') return ['public', 'member', 'participant', 'team', 'judge', 'admin']
  if (user.role === 'judge') return ['public', 'judge']
  return ['public', 'member', 'participant', 'team']
}

// 공통 헤더: 기능 페이지로 이동하는 메뉴
export default function Header({ user }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [away, setAway] = useState(false)
  const isLanding = pathname === '/'

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      // 메인 페이지는 첫 화면에서만 네브바를 보여준다: 첫 화면을 40% 넘게 벗어나면 배경에 녹아들며 사라진다
      setAway(window.scrollY > window.innerHeight * 0.4)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [pathname])

  // 페이지를 옮기면 모바일 메뉴를 닫는다
  useEffect(() => setOpen(false), [pathname])

  const access = accessFor(user)
  const items = NAV.filter((n) => access.includes(n.access))
  const meActive = pathname === '/me' || pathname.startsWith('/me/')
  const hidden = isLanding && away && !open

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''} ${open ? 'open' : ''} ${hidden ? 'faded' : ''}`}>
      <Link className="logo" href="/">
        {HOSTS.map((h) => <span key={h.key} className={`dot ${h.key}`} />)}
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
        {user ? (
          <Link className={`btn small ghost ${meActive ? 'active' : ''}`} href="/me">{user.name || '내 정보'}</Link>
        ) : (
          <Link className={`btn small ghost ${pathname === '/login' ? 'active' : ''}`} href="/login">로그인</Link>
        )}
        <button className="menu-btn" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span /><span />
        </button>
      </div>
    </header>
  )
}
