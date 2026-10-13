import { NextResponse } from 'next/server'
import { currentUser } from '../../../auth.js'
import { TeamError, getTeamState, teamActions } from '../../../lib/team.js'

// 내 팀 · 결과물 제출 API (기획서 기능 4 · 5)
//   GET  /api/team                    → 내 팀 화면 상태
//   POST /api/team { action, ... }    → 작업 후 바뀐 상태
//     action: rename | set_role | save_submission
//             | upload_url { kind: 'slides' | 'cover', type, size } → { path, uploadUrl } (상태 대신)

async function guard() {
  const me = await currentUser()
  if (!me) return { res: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) }
  if (me.role !== 'participant') return { res: NextResponse.json({ error: '참가자 계정만 이용할 수 있습니다.' }, { status: 403 }) }
  return { me }
}

export async function GET() {
  const { me, res } = await guard()
  if (res) return res
  return NextResponse.json(await getTeamState(me.id))
}

export async function POST(request) {
  const { me, res } = await guard()
  if (res) return res

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  const action = teamActions[body?.action]
  if (!action) return NextResponse.json({ error: '알 수 없는 작업입니다.' }, { status: 400 })

  let result
  try {
    result = await action(me.id, body)
  } catch (e) {
    if (e instanceof TeamError) {
      return NextResponse.json({ error: e.message, code: e.code, state: await getTeamState(me.id) }, { status: 409 })
    }
    throw e
  }
  if (body.action === 'upload_url') return NextResponse.json(result)
  return NextResponse.json(await getTeamState(me.id))
}
