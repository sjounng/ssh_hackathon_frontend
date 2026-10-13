import { NextResponse } from 'next/server'
import { currentUser } from '../../../auth.js'
import { ApplyError, applyActions, getApplyState, normalizeApplyBody } from '../../../lib/apply.js'

// 참가 신청 API (기획서 기능 3)
//   GET  /api/apply                    → 신청 화면 상태
//   POST /api/apply { action, ... }    → 신청 작업 후 바뀐 상태
//     action: save_solo | cancel_solo | create_team | join_team | save_member
//             | rename_team | leave_team | submit_team | withdraw_team

async function guard() {
  const me = await currentUser()
  if (!me) return { res: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }
  if (me.role !== 'participant') return { res: NextResponse.json({ error: '참가자 계정만 신청할 수 있습니다.' }, { status: 403 }) }
  if (!me.profileCompleted) return { res: NextResponse.json({ error: '먼저 내 정보를 입력해 주세요.' }, { status: 403 }) }
  return { me }
}

export async function GET() {
  const { me, res } = await guard()
  if (res) return res
  return NextResponse.json(await getApplyState(me.id))
}

export async function POST(request) {
  const { me, res } = await guard()
  if (res) return res

  let body
  try {
    body = normalizeApplyBody(await request.json())
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  const action = applyActions[body.action]
  if (!action) return NextResponse.json({ error: '알 수 없는 작업입니다.' }, { status: 400 })

  try {
    await action(me.id, body)
  } catch (e) {
    if (e instanceof ApplyError) {
      return NextResponse.json({ error: e.message, code: e.code, state: await getApplyState(me.id) }, { status: 409 })
    }
    throw e
  }
  return NextResponse.json(await getApplyState(me.id))
}
