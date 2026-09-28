import { Inter_Tight, JetBrains_Mono, Unbounded } from 'next/font/google'
import './globals.css'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-unbounded' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter-tight' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' })

export const metadata = {
  title: '연합 해커톤',
  description: '한양대 × 성균관대 × 서강대 연합 해커톤',
}

export const viewport = {
  themeColor: '#050608',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${unbounded.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <head>
        {/* 한글 본문 글꼴 (Google Fonts에 없어 CDN으로 불러온다) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
