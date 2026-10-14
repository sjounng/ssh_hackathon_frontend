import Link from 'next/link'

// 수상 팀 목록 (데이터는 lib/results.js). 첫 번째 상(대상)은 크게 보여 준다
export default function ResultsList({ awards }) {
  return (
    <ol className="results-list">
      {awards.map((a, i) => (
        <li key={a.id} className={i === 0 ? 'first' : ''}>
          <Link href={`/projects/${a.teamId}`} className="glass result-card">
            <div className="project-cover">
              {a.coverUrl ? <img src={a.coverUrl} alt="" /> : <span aria-hidden="true">{a.projectName.slice(0, 1)}</span>}
            </div>
            <div className="result-body">
              <p className="result-title">{a.title}</p>
              <h3>{a.projectName}</h3>
              <p className="project-team">{a.teamName || '팀명 미정'}</p>
              {a.tagline && <p className="muted project-tagline">{a.tagline}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  )
}
