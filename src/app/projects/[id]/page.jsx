import { notFound } from 'next/navigation'
import { currentUser } from '../../../auth.js'
import { getProject } from '../../../lib/projects.js'
import { ProjectDetail } from '../../../components/ProjectGallery.jsx'

export const metadata = { title: '프로젝트 · 연합 해커톤' }

// 프로젝트 상세. 볼 수 없는 프로젝트도 '없음'과 같게 보여 준다 (결과 공개 전 다른 팀 결과물이 있는지 드러나지 않게)
export default async function ProjectPage({ params }) {
  const { id } = await params
  const p = await getProject(await currentUser(), id)
  if (!p) notFound()
  return (
    <main className="page">
      <div className="page-inner wide">
        <ProjectDetail p={p} />
      </div>
    </main>
  )
}
