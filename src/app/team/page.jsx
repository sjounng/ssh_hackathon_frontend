import { redirect } from 'next/navigation'
import { currentUser } from '../../auth.js'
import { getTeamState } from '../../lib/team.js'
import TeamPanel from '../../components/TeamPanel.jsx'
import NotParticipant from '../../components/NotParticipant.jsx'

export const metadata = { title: '내 팀 · 연합 해커톤' }

// 내 팀 (기획서 기능 4)
export default async function TeamPage() {
  const me = await currentUser()
  if (!me) redirect('/login')
  if (!me.profileCompleted) redirect('/me/profile')
  if (me.role !== 'participant') return <NotParticipant title="내 팀" />

  return (
    <main className="page">
      <div className="page-inner">
        <TeamPanel initial={await getTeamState(me.id)} />
      </div>
    </main>
  )
}
