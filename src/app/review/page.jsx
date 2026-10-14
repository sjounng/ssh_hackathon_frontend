import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '../../auth.js'
import { getReviewState } from '../../lib/judging.js'
import ReviewBoard from '../../components/ReviewBoard.jsx'

export const metadata = { title: '심사 · 연합 해커톤' }

// 심사 (기획서 기능 7): 심사위원이 팀마다 평가 항목별 점수를 매긴다. 현황과 순위는 관리자 > 심사
export default async function ReviewPage() {
  const me = await currentUser()
  if (!me) redirect('/login')
  const state = await getReviewState(me.id)

  if (state.role !== 'judge') {
    return (
      <main className="page">
        <div className="page-inner">
          <h1>심사</h1>
          <p className="lede">
            {state.role === 'admin'
              ? '운영진은 점수를 매기지 않습니다. 심사 진행 현황과 순위는 관리자 페이지의 심사 탭에서 볼 수 있습니다.'
              : '심사위원 계정에서만 쓰는 페이지입니다.'}
          </p>
          <Link className="btn ghost" href={state.role === 'admin' ? '/admin' : '/'}>{state.role === 'admin' ? '관리자' : '메인으로'}</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-inner wide">
        <ReviewBoard initial={state} />
      </div>
    </main>
  )
}
