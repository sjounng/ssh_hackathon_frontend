import { NextResponse } from 'next/server'
import { currentUser } from '../../../auth.js'
import { ReviewError, getReviewState, saveScores } from '../../../lib/judging.js'

// 심사 API (기획서 기능 7)
//   GET  /api/review                                        → 심사 화면 상태
//   POST /api/review { action: 'save', teamId, scores }     → 저장 후 바뀐 상태
// 심사위원인지는 DB 함수가 다시 확인한다

export async function GET() {
  const me = await currentUser()
  if (!me) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  return NextResponse.json(await getReviewState(me.id))
}

export async function POST(request) {
  const me = await currentUser()
  if (!me) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  if (body?.action !== 'save') return NextResponse.json({ error: '알 수 없는 작업입니다.' }, { status: 400 })

  try {
    await saveScores(me.id, body)
  } catch (e) {
    if (e instanceof ReviewError) {
      return NextResponse.json({ error: e.message, code: e.code, state: await getReviewState(me.id) }, { status: 409 })
    }
    throw e
  }
  return NextResponse.json(await getReviewState(me.id))
}
