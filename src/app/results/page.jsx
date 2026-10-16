import Link from 'next/link'
import { currentUser } from '../../auth.js'
import { RESULTS } from '../../content.js'
import { getResults } from '../../lib/results.js'
import { formatKstDateTime } from '../../lib/schedule.js'
import ResultsList from '../../components/ResultsList.jsx'

export const metadata = { title: '결과 발표' }

// 결과 발표 (기획서 기능 8). 공개 전에는 발표 예정 안내, 운영진에게는 미리보기
export default async function ResultsPage() {
  const r = await getResults(await currentUser())
  const shown = r.published || r.preview

  return (
    <main className="page">
      <div className="page-inner gallery">
        <h1>{RESULTS.title}</h1>
        <p className="lede">
          {r.published && RESULTS.desc}
          {r.preview && '운영진 미리보기: 아직 공개 전입니다. 관리자 > 결과에서 공개하면 누구에게나 이 화면이 보입니다.'}
          {!shown && `결과는 ${r.announceAt ? `${formatKstDateTime(r.announceAt)}에` : '행사 당일'} 발표합니다.`}
        </p>
        {shown && r.awards.length > 0 && <ResultsList awards={r.awards} />}
        {shown && r.awards.length === 0 && <p className="glass page-card muted">아직 정한 수상 팀이 없습니다.</p>}
        <div className="actions results-actions">
          {r.published && <Link className="btn primary" href="/projects">모든 프로젝트 보기</Link>}
          <Link className="btn ghost" href="/">메인으로</Link>
        </div>
      </div>
    </main>
  )
}
