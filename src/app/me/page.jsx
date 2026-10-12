import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser, signOut } from '../../auth.js'
import { SCHOOL_LABEL, getMyOverview } from '../../lib/users.js'

export const metadata = { title: '내 정보 · 연합 해커톤' }

const STATUS_LABEL = {
  draft: '작성 중',
  submitted: '제출 완료 · 선발 결과를 기다리는 중',
  approved: '승인',
  rejected: '거절',
}
const ROLE_LABEL = { judge: '심사위원', admin: '운영진' }

// 내 정보 (기획서 기능 2): 프로필 확인·수정, 신청 상태 확인
export default async function MePage() {
  const me = await currentUser()
  if (!me) redirect('/login')

  const { user, application, team } = await getMyOverview(me.id)
  if (!user?.profile_completed_at) redirect('/me/profile')

  async function logout() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  const rows = [
    ['이름', user.name],
    ['소속', user.school ? SCHOOL_LABEL[user.school] : ROLE_LABEL[user.role] ?? '-'],
    ['이메일', user.email],
    ...(user.school ? [['학번', user.student_id]] : []),
    ['연락처', user.phone],
  ]

  return (
    <main className="page">
      <div className="page-inner">
        <h1>내 정보</h1>
        {ROLE_LABEL[user.role] && <p className="lede">{ROLE_LABEL[user.role]} 계정입니다.</p>}

        <dl className="glass rows page-card">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {user.role === 'participant' && (
          <dl className="glass rows page-card">
            <div>
              <dt>참가 신청</dt>
              <dd>
                {application ? (
                  <>
                    {application.kind === 'team' ? '팀 참가' : '개인 참가'} · {STATUS_LABEL[application.status]}
                  </>
                ) : (
                  <>아직 신청하지 않았습니다. <Link href="/apply" className="text-link">참가 신청하기</Link></>
                )}
              </dd>
            </div>
            {team && (
              <div>
                <dt>소속 팀</dt>
                <dd>
                  <Link href="/team" className="text-link">{team.name || '팀명 미정'}</Link>
                  {team.leader_id === user.id && ' · 팀장'}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="actions">
          <Link className="btn ghost" href="/me/profile">정보 수정</Link>
          <form action={logout}>
            <button className="btn ghost" type="submit">로그아웃</button>
          </form>
        </div>
      </div>
    </main>
  )
}
