import { NextResponse } from 'next/server'
import {
  AdminError, addInvite, addMember, createTeam, decide, deleteCriterion, getAdminData, removeInvite, removeMember,
  requireAdmin, saveConfig, saveCriterion, setLeader, setPresentationOrder, setRole, voidScores,
} from '../../../lib/admin.js'
import { MailError, sendMail, sendTestMail } from '../../../lib/mail.js'

// 메일을 여러 번에 나눠 보내므로 넉넉히 둔다 (Vercel 함수 실행 시간)
export const maxDuration = 60

// 관리자 API (기획서 기능 9). 운영진만 사용. GET은 화면 데이터, POST는 작업 후 바뀐 데이터를 돌려준다
const ACTIONS = {
  decide: (a, b) => decide(a, b.ids, b.status),
  create_team: (a, b) => createTeam(a, b.name, b.userIds, b.leaderId),
  add_member: (a, b) => addMember(a, b.teamId, b.userId),
  remove_member: (a, b) => removeMember(a, b.teamId, b.userId),
  set_leader: (a, b) => setLeader(a, b.teamId, b.userId),
  set_order: (a, b) => setPresentationOrder(a, b.teamIds),
  save_config: (a, b) => saveConfig(b.config ?? {}),
  set_role: (a, b) => setRole(a, b.userId, b.role),
  add_invite: (a, b) => addInvite(b.email, b.role, b.note),
  remove_invite: (a, b) => removeInvite(b.email),
  save_criterion: (a, b) => saveCriterion(b.criterion),
  delete_criterion: (a, b) => deleteCriterion(b.id, b.force),
  void_scores: (a, b) => voidScores(b.judgeId, b.teamId, b.voided === true),
  // 메일: 결과({ sent, failed } 등)를 화면 데이터와 함께 돌려준다
  send_mail: (a, b, ctx) => sendMail(a, b.kind, ctx.origin),
  test_mail: (a, b, ctx) => sendTestMail(ctx.admin, b.kind, ctx.origin),
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '운영진만 접근할 수 있습니다.' }, { status: 403 })
  return NextResponse.json(await getAdminData())
}

export async function POST(request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '운영진만 접근할 수 있습니다.' }, { status: 403 })

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  const action = ACTIONS[body.action]
  if (!action) return NextResponse.json({ error: '알 수 없는 작업입니다.' }, { status: 400 })

  let result
  try {
    result = await action(admin.id, body, { admin, origin: new URL(request.url).origin })
  } catch (e) {
    if (e instanceof AdminError || e instanceof MailError) return NextResponse.json({ error: e.message, code: e.code }, { status: 409 })
    throw e
  }
  const data = await getAdminData()
  return NextResponse.json(body.action.endsWith('_mail') ? { ...data, result } : data)
}
