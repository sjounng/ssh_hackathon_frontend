import Link from 'next/link'
import { currentUser } from '../../auth.js'
import { PROJECTS } from '../../content.js'
import { getGallery } from '../../lib/projects.js'
import { formatKstDateTime } from '../../lib/schedule.js'
import { ProjectGrid } from '../../components/ProjectGallery.jsx'

export const metadata = { title: '프로젝트' }

// 프로젝트 갤러리 (기획서 기능 6). 보는 범위는 lib/projects.js의 galleryScope
export default async function ProjectsPage() {
  const me = await currentUser()
  const g = await getGallery(me)
  const { judgingStartAt, resultsAnnounceAt } = g.schedule
  const at = (v) => (v ? ` (${formatKstDateTime(v)})` : '')

  const lede = {
    public: PROJECTS.desc,
    admin: `운영진 보기: 임시 저장을 포함한 모든 팀의 결과물입니다. 참가자·방문자에게는 결과 발표 뒤에 공개됩니다.`,
    judge: '최종 제출된 프로젝트입니다. 발표 순서대로 정렬되어 있습니다.',
    own: '결과 발표 전까지는 우리 팀 프로젝트만 볼 수 있습니다.',
    none: g.role === 'judge'
      ? `심사가 시작되면${at(judgingStartAt)} 제출된 프로젝트를 볼 수 있습니다.`
      : `결과 발표 뒤 모든 프로젝트를 공개합니다.${at(resultsAnnounceAt)}`,
  }[g.scope]

  return (
    <main className="page">
      <div className="page-inner gallery">
        <h1>{PROJECTS.title}</h1>
        <p className="lede">{lede}</p>
        {g.projects.length > 0 && <ProjectGrid projects={g.projects} />}
        {g.projects.length === 0 && g.scope === 'own' && (
          <div className="actions">
            <Link className="btn primary" href="/submit">결과물 제출</Link>
            <Link className="btn ghost" href="/team">내 팀</Link>
          </div>
        )}
        {g.projects.length === 0 && ['public', 'admin', 'judge'].includes(g.scope) && (
          <p className="glass page-card muted">아직 제출된 프로젝트가 없습니다.</p>
        )}
        {g.scope === 'none' && !me && (
          <div className="actions"><Link className="btn ghost" href="/">메인으로</Link></div>
        )}
      </div>
    </main>
  )
}
