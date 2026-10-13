import { Inter_Tight, JetBrains_Mono, Unbounded } from 'next/font/google'
import BackgroundScene from '../components/BackgroundScene.jsx'
import Header from '../components/Header.jsx'
import Hud from '../components/Hud.jsx'
import LiquidGlassFilter from '../components/LiquidGlassFilter.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { currentUser } from '../auth.js'
import { EVENT } from '../content.js'
import './globals.css'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-unbounded' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter-tight' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' })

export const metadata = {
  title: EVENT.name,
  description: EVENT.summary,
}

export const viewport = {
  themeColor: '#050608',
}

export default async function RootLayout({ children }) {
  const user = await currentUser()
  return (
    <html lang="ko" className={`${unbounded.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <head>
        {/* 한글 본문 글꼴 (Google Fonts에 없어 CDN으로 불러온다) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {/* 3D 배경·HUD·헤더·푸터는 모든 페이지에 공통. 페이지를 옮겨도 배경이 끊기지 않는다 */}
        <LiquidGlassFilter />
        <BackgroundScene />
        <Hud />
        <Header user={user ? { name: user.name, role: user.role } : null} />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
