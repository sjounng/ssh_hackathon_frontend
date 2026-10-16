import Backdrop from '../components/Backdrop.jsx'
import Header from '../components/Header.jsx'
import LiquidGlassFilter from '../components/LiquidGlassFilter.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { currentUser } from '../auth.js'
import { EVENT } from '../content.js'
import './globals.css'

// 페이지별 제목은 '내 정보'처럼 이름만 쓰면 '내 정보 · SSH HACKATHON'이 된다
export const metadata = {
  title: { default: `${EVENT.name} · ${EVENT.subtitle}`, template: `%s · ${EVENT.name}` },
  description: EVENT.summary,
}

export const viewport = {
  themeColor: '#2e2e2e',
}

export default async function RootLayout({ children }) {
  const user = await currentUser()
  return (
    <html lang="ko">
      <head>
        {/* 본문·제목 글꼴 Pretendard (Google Fonts에 없어 CDN으로 불러온다) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {/* 배경·헤더·푸터는 모든 페이지에 공통 */}
        <LiquidGlassFilter />
        <Backdrop />
        <Header user={user ? { name: user.name, role: user.role } : null} />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
