import Link from 'next/link'
import { SCHOOL_SHORT } from '../lib/labels.js'

// 프로젝트 갤러리 화면 (데이터는 lib/projects.js). 카드 하나 = 팀 하나
const pad = (n) => String(n).padStart(2, '0')

export function ProjectGrid({ projects }) {
  return (
    <ul className="project-grid">
      {projects.map((p) => (
        <li key={p.teamId}>
          <Link href={`/projects/${p.teamId}`} className="glass project-card">
            <Cover url={p.coverUrl} name={p.projectName} />
            <div className="project-card-body">
              <Badges p={p} />
              <h3>{p.projectName}</h3>
              <p className="project-team">{p.teamName || '팀명 미정'}</p>
              {p.tagline && <p className="muted project-tagline">{p.tagline}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// 대표 이미지가 없으면 프로젝트명 첫 글자
function Cover({ url, name, large }) {
  return (
    <div className={`project-cover${large ? ' large' : ''}`}>
      {url ? <img src={url} alt="" /> : <span aria-hidden="true">{name.slice(0, 1)}</span>}
    </div>
  )
}

function Badges({ p }) {
  if (!p.order && !p.draft && !p.awards.length) return null
  return (
    <p className="project-badges">
      {p.order && <span className="mono">발표 {pad(p.order)}</span>}
      {p.awards.map((a) => <span key={a} className="status s-approved">{a}</span>)}
      {p.draft && <span className="status">임시 저장</span>}
    </p>
  )
}

const LINKS = [
  ['prototypeUrl', '프로토타입'],
  ['slidesUrl', '발표자료'],
  ['githubUrl', 'GitHub'],
  ['demoVideoUrl', '시연 영상'],
  ['deployUrl', '배포 링크'],
]

export function ProjectDetail({ p }) {
  return (
    <>
      <p className="back-link"><Link className="text-link" href="/projects">← 프로젝트 목록</Link></p>
      <Badges p={p} />
      <h1>{p.projectName}</h1>
      <p className="project-team">{p.teamName || '팀명 미정'}</p>
      {p.tagline && <p className="lede">{p.tagline}</p>}
      {p.coverUrl && <Cover url={p.coverUrl} name={p.projectName} large />}

      {p.description && (
        <section className="glass page-card">
          <div className="page-card-head"><h2>소개</h2></div>
          <p className="muted pre">{p.description}</p>
        </section>
      )}

      <section className="glass page-card">
        <div className="page-card-head"><h2>제출물</h2></div>
        <dl className="rows submission-rows">
          {LINKS.map(([k, label]) => (
            <div key={k}>
              <dt>{label}</dt>
              <dd>
                {p[k]
                  ? <a className="text-link" href={p[k]} target="_blank" rel="noreferrer">{k === 'slidesUrl' ? 'PDF 열기' : p[k]}</a>
                  : <span className="pending">없음</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="glass page-card">
        <div className="page-card-head">
          <h2>팀원</h2>
          <span className="note">{p.members.length}명</span>
        </div>
        <dl className="rows member-rows">
          {p.members.map((m, i) => (
            <div key={i}>
              <dt>{m.name}{m.leader && <span className="note"> · 팀장</span>}</dt>
              <dd>{[SCHOOL_SHORT[m.school], m.role || '역할 미정'].filter(Boolean).join(' · ')}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
