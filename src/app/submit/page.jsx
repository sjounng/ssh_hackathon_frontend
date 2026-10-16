import { redirect } from 'next/navigation'
import { currentUser } from '../../auth.js'
import { getTeamState } from '../../lib/team.js'
import SubmissionForm from '../../components/SubmissionForm.jsx'
import NotParticipant from '../../components/NotParticipant.jsx'

export const metadata = { title: '결과물 제출' }

// 결과물 제출 (기획서 기능 5)
export default async function SubmitPage() {
  const me = await currentUser()
  if (!me) redirect('/login')
  if (!me.profileCompleted) redirect('/me/profile')
  if (me.role !== 'participant') return <NotParticipant title="결과물 제출" />

  return (
    <main className="page">
      <div className="page-inner">
        <SubmissionForm initial={await getTeamState(me.id)} />
      </div>
    </main>
  )
}
