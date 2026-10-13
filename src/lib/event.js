import 'server-only'
import { db } from './supabase.js'

// 첫 화면에 보여줄 일정·팀 인원 (관리자 페이지 > 일정). 화면이 쓰는 칸만 골라 브라우저로 넘긴다
const PUBLIC_FIELDS = [
  'apply_open_at', 'apply_close_at', 'selection_announce_at', 'team_assign_at', 'event_start_at', 'event_end_at',
  'submit_deadline_at', 'judging_start_at', 'judging_end_at', 'results_announce_at', 'team_min_size', 'team_max_size',
]

// DB에 닿지 못하면 null: 날짜는 '[미정]', 신청 버튼은 비활성으로 그린다
export async function getPublicSchedule() {
  try {
    // '*'로 읽어, 아직 적용하지 않은 마이그레이션의 칸이 있어도 나머지는 보여준다
    const { data, error } = await db().from('event_config').select('*').single()
    if (error) throw error
    return Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, data[k] ?? null]))
  } catch {
    return null
  }
}
