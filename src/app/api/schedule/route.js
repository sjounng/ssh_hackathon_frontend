import { NextResponse } from 'next/server'
import { db } from '../../../lib/supabase.js'

// 공개 일정 (첫 화면 신청 버튼 등). 관리자 페이지의 일정 관리 값이 기준이다
export async function GET() {
  try {
    const { data, error } = await db().from('event_config').select('apply_open_at, apply_close_at').single()
    if (error) throw error
    return NextResponse.json({ applyOpenAt: data.apply_open_at, applyCloseAt: data.apply_close_at })
  } catch {
    return NextResponse.json({ applyOpenAt: null, applyCloseAt: null, unavailable: true })
  }
}
