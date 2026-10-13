import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '../../auth.js'
import { getApplyState } from '../../lib/apply.js'
import ApplyFlow from '../../components/ApplyFlow.jsx'

export const metadata = { title: '참가 신청 · 연합 해커톤' }

// 참가 신청 (기획서 기능 3): 로그인·프로필 확인 후 신청 화면
export default async function ApplyPage() {
  const me = await currentUser()
  if (!me) redirect('/login')
  if (!me.profileCompleted) redirect('/me/profile')

  if (me.role !== 'participant') {
    return (
      <main className="page">
        <div className="page-inner">
          <h1>참가 신청</h1>
          <p className="lede">심사위원·운영진 계정은 참가 신청을 할 수 없습니다.</p>
          <Link className="btn ghost" href="/me">내 정보</Link>
        </div>
      </main>
    )
  }

  const state = await getApplyState(me.id)
  return (
    <main className="page">
      <div className="page-inner wide">
        <ApplyFlow initial={state} myId={me.id} />
      </div>
    </main>
  )
}
