import { NextResponse } from 'next/server'
import { currentUser } from '../../../auth.js'
import { getMyOverview, getUserById, updateProfile } from '../../../lib/users.js'

// 내 정보 조회
export async function GET() {
  const me = await currentUser()
  if (!me) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  return NextResponse.json(await getMyOverview(me.id))
}

// 프로필 입력·수정 (최초 로그인 시 필수 입력 포함)
export async function PATCH(request) {
  const me = await currentUser()
  if (!me) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const user = await getUserById(me.id)
  if (!user) return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })

  const result = await updateProfile(user, body)
  if (result.errors) return NextResponse.json({ errors: result.errors }, { status: 422 })
  return NextResponse.json({ user: result.user })
}
