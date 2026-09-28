import Link from 'next/link'
import { PAGES } from '../content.js'

// 아직 구현되지 않은 기능 페이지의 공통 틀: 기획서의 기능 요약과 "준비 중" 표시
export default function FeaturePage({ id }) {
  const page = PAGES[id]
  return (
    <main className="page">
      <div className="page-inner">
        <p className="eyebrow mono">{page.code}</p>
        <h1>{page.title}</h1>
        <p className="lede">{page.desc}</p>
        <div className="glass page-card">
          <div className="page-card-head">
            <h2>이 페이지에 들어갈 기능</h2>
            <span className="chip mono">준비 중</span>
          </div>
          <ul>
            {page.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <Link className="btn ghost" href="/">메인으로</Link>
      </div>
    </main>
  )
}
