// 실제 Supabase에서 내 팀·결과물 제출 흐름 점검 (src/lib/team.js + Storage 업로드).
// 승인된 테스트 참가자 2명으로 배정 팀을 만들고, 끝나면 사용자·팀·올린 파일을 모두 지운다
// 일정(선발 발표·팀 배정 발표·제출 기간)에 막히는 단계는 이유를 알리고 건너뛴다. 팀 폴더 파일 정리는 일정과 상관없이 확인한다
// 실행: node --conditions=react-server --env-file=.env.local scripts/smoke-team.mjs
import assert from 'node:assert/strict'
import { db } from '../src/lib/supabase.js'
import { TeamError, cleanTeamFiles, getTeamState, teamActions } from '../src/lib/team.js'

const tag = `smoke-${Date.now()}`
const emails = ['a', 'b'].map((x) => `${tag}-${x}@hanyang.ac.kr`)
const { data: users, error } = await db()
  .from('users')
  .insert(emails.map((email, i) => ({ email, school: 'hanyang', name: `테스트${i + 1}`, profile_completed_at: new Date().toISOString() })))
  .select('id, email')
if (error) throw error
const [A, B] = emails.map((e) => users.find((u) => u.email === e).id)
let teamId

// 브라우저가 하는 것처럼 서명 주소로 파일을 올린다
async function upload(user, kind, type, content) {
  const { path, uploadUrl } = await teamActions.upload_url(user, { kind, type, size: content.length })
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': type }, body: new Blob([content], { type }) })
  assert.equal(res.status, 200, `upload ${kind}`)
  return path
}
const filesIn = async () => (await db().storage.from('submissions').list(teamId)).data.map((f) => `${teamId}/${f.name}`)
const skip = (why) => {
  console.log(`! ${why}. 관리자 > 일정에서 그 칸을 비우거나 지난 시각으로 두면 이 단계까지 확인할 수 있습니다`)
}

async function steps() {
  const now = new Date().toISOString()
  const { error: e1 } = await db().from('applications').insert([A, B].map((user_id) => ({ user_id, kind: 'solo', desired_role: 'FE', motivation: '스모크', status: 'approved', submitted_at: now, decided_at: now })))
  if (e1) throw e1
  const { data: t, error: e2 } = await db().from('teams').insert({ origin: 'assigned', leader_id: A }).select('id').single()
  if (e2) throw e2
  teamId = t.id

  // 팀 폴더 정리: 결과물이 쓰는 파일만 남기고, 팀이 없어지면 폴더를 비운다 (실제 Storage list·remove)
  for (const name of ['slides-keep.pdf', 'cover-orphan.png']) {
    const type = name.endsWith('pdf') ? 'application/pdf' : 'image/png'
    const { error: e } = await db().storage.from('submissions').upload(`${teamId}/${name}`, new Blob(['x'], { type }), { contentType: type })
    if (e) throw e
  }
  await cleanTeamFiles(teamId, [`${teamId}/slides-keep.pdf`])
  assert.deepEqual(await filesIn(), [`${teamId}/slides-keep.pdf`])
  await cleanTeamFiles(teamId)
  assert.deepEqual(await filesIn(), [])
  console.log('✓ 팀 폴더 정리 (쓰지 않는 파일 삭제, 팀이 없어지면 폴더 비우기)')

  let s = await getTeamState(A)
  if (s.stage === 'pending') return skip('선발 발표 시각 전이라 승인 결과가 아직 보이지 않습니다 (결과 대기)')
  const { error: e3 } = await db().from('team_members').insert([{ team_id: teamId, user_id: A }, { team_id: teamId, user_id: B }])
  if (e3) throw e3

  s = await getTeamState(B)
  if (s.stage === 'waiting') return skip('팀 배정 발표 시각 전이라 팀이 보이지 않습니다')
  assert.equal(s.stage, 'team')
  assert.equal(s.team.members.length, 2)
  assert.equal(s.canRename, false)
  await assert.rejects(teamActions.rename(B, { name: '팀원이 바꿈' }), (e) => e instanceof TeamError && e.code === 'NOT_LEADER')
  await teamActions.rename(A, { name: '스모크 팀' })
  await teamActions.set_role(B, { role: '백엔드' })
  s = await getTeamState(B)
  assert.equal(s.team.name, '스모크 팀')
  assert.equal(s.team.members.find((m) => m.userId === B).role, '백엔드')
  console.log('✓ 팀 화면 · 팀명(팀장만) · 내 역할')

  if (s.submitWindow !== 'open') return skip(`지금은 결과물 제출 기간이 아닙니다 (${s.submitWindow})`)
  await assert.rejects(teamActions.upload_url(B, { kind: 'slides', type: 'application/pdf', size: 10 }), (e) => e.code === 'NOT_LEADER')
  await assert.rejects(teamActions.upload_url(A, { kind: 'slides', type: 'text/html', size: 10 }), (e) => e.code === 'INVALID_FILE')
  console.log('✓ 업로드 주소: 팀원·잘못된 형식 거부')

  const slides1 = await upload(A, 'slides', 'application/pdf', '%PDF-1.4\n%1\n')
  const cover = await upload(A, 'cover', 'image/png', '\x89PNG\r\n')
  const sub = { projectName: '스모크 프로젝트', tagline: '한 줄', prototypeUrl: 'https://example.com', githubUrl: 'https://github.com/a/b', slidesPath: slides1, coverImagePath: cover }
  await assert.rejects(teamActions.save_submission(A, { submission: sub, submit: true }), (e) => e.code === 'PLEDGE_REQUIRED')
  await teamActions.save_submission(A, { submission: { ...sub, pledge: true }, submit: true })
  s = await getTeamState(B)
  assert.ok(s.submission.submittedAt)
  assert.equal((await fetch(s.submission.slidesUrl)).status, 200)
  console.log('✓ 파일 업로드 → 제출 → 팀원이 발표자료 열람')

  // 새 발표자료로 바꾸고, 대표 이미지는 하나 더 올리기만 하고 저장하지 않는다 → 둘 다 정리된다
  const slides2 = await upload(A, 'slides', 'application/pdf', '%PDF-1.4\n%2\n')
  const abandoned = await upload(A, 'cover', 'image/png', '\x89PNG\r\n2')
  await teamActions.save_submission(A, { submission: { ...sub, slidesPath: slides2, pledge: true } })
  assert.deepEqual((await filesIn()).sort(), [cover, slides2].sort())
  assert.ok(!abandoned.endsWith(cover))
  console.log('✓ 발표자료 교체 · 저장하지 않은 업로드 → 옛 파일 삭제')
}

try {
  await steps()
} finally {
  if (teamId) {
    const files = await filesIn().catch(() => [])
    if (files.length) await db().storage.from('submissions').remove(files)
    await db().from('teams').delete().eq('id', teamId)
  }
  await db().from('users').delete().in('id', [A, B])
  const { count } = await db().from('users').select('*', { count: 'exact', head: true }).like('email', `${tag}%`)
  console.log(`정리 완료 (남은 테스트 사용자 ${count}명)`)
}
