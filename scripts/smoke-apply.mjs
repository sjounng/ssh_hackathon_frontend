// 실제 Supabase에서 참가 신청 서버 코드(src/lib/apply.js) 흐름 점검. 테스트 사용자를 만들고 끝나면 지운다
// 실행: node --conditions=react-server --env-file=.env.local scripts/smoke-apply.mjs
import assert from 'node:assert/strict'
import { db } from '../src/lib/supabase.js'
import { ApplyError, applyActions, getApplyState, normalizeApplyBody } from '../src/lib/apply.js'

const tag = `smoke-${Date.now()}`
const emails = ['a', 'b', 'c'].map((x) => `${tag}-${x}@hanyang.ac.kr`)
const { data: users, error } = await db()
  .from('users')
  .insert(emails.map((email, i) => ({ email, school: 'hanyang', name: `테스트${i + 1}`, profile_completed_at: new Date().toISOString() })))
  .select('id, email')
if (error) throw error
const [A, B, C] = emails.map((e) => users.find((u) => u.email === e).id)
const run = (u, action, body = {}) => applyActions[action](u, normalizeApplyBody({ action, ...body }))

try {
  await run(A, 'create_team', { name: '스모크 팀' })
  let s = await getApplyState(A)
  assert.equal(s.team.name, '스모크 팀')
  assert.equal(s.team.joinCode.length, 6)
  console.log(`✓ 팀 만들기 (참가 코드 ${s.team.joinCode.length}자리)`)

  await run(B, 'join_team', { code: s.team.joinCode.toLowerCase() })
  await run(C, 'join_team', { code: s.team.joinCode })
  s = await getApplyState(A)
  assert.equal(s.team.members.length, 3)
  console.log('✓ 참가 코드로 합류 (3명)')

  await assert.rejects(run(A, 'submit_team'), (e) => e instanceof ApplyError && e.code === 'MEMBER_INCOMPLETE')
  console.log('✓ 역할 미작성 시 제출 거부 → "' + new ApplyError('MEMBER_INCOMPLETE').message + '"')

  await run(A, 'save_member', { role: '기획', techStack: 'Figma, Notion', motivation: '' })
  await run(B, 'save_member', { role: '프론트엔드', techStack: ['React'] })
  await run(C, 'save_member', { role: '백엔드', techStack: 'Spring' })
  s = await getApplyState(B)
  assert.deepEqual(s.application.techStack, ['React'])
  await run(A, 'submit_team')
  s = await getApplyState(C)
  assert.equal(s.application.status, 'submitted')
  assert.ok(s.team.submittedAt)
  console.log('✓ 역할 작성 → 팀 제출 → 팀원 전원 제출 완료')

  await assert.rejects(run(B, 'leave_team'), (e) => e.code === 'TEAM_ALREADY_SUBMITTED')
  await run(A, 'withdraw_team')
  await run(C, 'leave_team')
  s = await getApplyState(A)
  assert.equal(s.team.members.length, 2)
  assert.equal(s.application.status, 'draft')
  console.log('✓ 제출 취소 → 팀원 나가기')
} finally {
  // 테스트 데이터 정리 (팀 → 신청·팀원은 연쇄 삭제, 사용자 삭제)
  const { data: teams } = await db().from('teams').select('id').in('leader_id', [A, B, C])
  if (teams?.length) await db().from('teams').delete().in('id', teams.map((t) => t.id))
  await db().from('users').delete().in('id', [A, B, C])
  const { count } = await db().from('users').select('*', { count: 'exact', head: true }).like('email', `${tag}%`)
  console.log(`정리 완료 (남은 테스트 사용자 ${count}명)`)
}
