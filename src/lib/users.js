import 'server-only'
import { db } from './supabase.js'
import { validateProfile } from './profile.js'
import { announcedStatus } from './schedule.js'

export { SCHOOL_LABEL } from './labels.js'

// 로그인 허용 여부: 초청 목록에 있으면 초청 역할, 학교 도메인이면 소속 학교. 둘 다 아니면 null(차단).
// 초청 목록을 먼저 본다: 학교 메일을 쓰는 심사위원(교수 등)도 참가자가 아니라 초청한 역할로 들어온다
export async function resolveAccess(email) {
  const { data: inv, error: e1 } = await db().from('invited_emails').select('role').eq('email', email).maybeSingle()
  if (e1) throw e1
  if (inv) return { school: null, role: inv.role }

  const domain = email.split('@')[1]
  const { data: d, error: e2 } = await db().from('allowed_domains').select('school').eq('domain', domain).maybeSingle()
  if (e2) throw e2
  if (d) return { school: d.school, role: null }
  return null
}

// 로그인할 때마다 사용자 행을 만들거나 소속·초청 역할을 최신으로 맞춘다
export async function upsertUserOnSignIn(email, access) {
  const existing = await getUserByEmail(email)
  if (!existing) {
    const { data, error } = await db()
      .from('users')
      .insert({ email, school: access.school, role: access.role ?? 'participant' })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const patch = { school: access.school ?? existing.school }
  // 초청 목록의 역할은 반영하되, 운영진이 직접 지정한 admin은 내리지 않는다
  if (access.role && existing.role !== 'admin') patch.role = access.role
  const { data, error } = await db().from('users').update(patch).eq('id', existing.id).select().single()
  if (error) throw error
  return data
}

export async function getUserByEmail(email) {
  const { data, error } = await db().from('users').select('*').eq('email', email).maybeSingle()
  if (error) throw error
  return data
}

export async function getUserById(id) {
  const { data, error } = await db().from('users').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

// 내 정보 화면용: 프로필 + 신청 상태 + 소속 팀.
// 선발 결과는 선발 발표 시각부터, 운영진이 배정한 팀은 팀 배정 발표 시각부터 보인다 (내 팀 페이지와 같은 규칙)
export async function getMyOverview(userId) {
  const [user, app, member, cfg] = await Promise.all([
    getUserById(userId),
    db().from('applications').select('kind, status, submitted_at').eq('user_id', userId).maybeSingle(),
    db().from('team_members').select('role, teams(id, name, origin, leader_id)').eq('user_id', userId).maybeSingle(),
    db().from('event_config').select('selection_announce_at, team_assign_at').single(),
  ])
  for (const r of [app, member, cfg]) if (r.error) throw r.error
  const c = cfg.data
  const application = app.data && { ...app.data, status: announcedStatus(app.data.status, c.selection_announce_at) }
  let team = member.data?.teams ?? null
  if (team?.origin === 'assigned' && (application?.status !== 'approved' || (c.team_assign_at && Date.now() < Date.parse(c.team_assign_at)))) {
    team = null
  }
  return { user, application, team }
}

export async function updateProfile(user, input) {
  const { errors, values } = validateProfile(input, { needsStudentId: user.school !== null })
  if (Object.keys(errors).length) return { errors }

  const now = new Date().toISOString()
  const patch = {
    ...values,
    privacy_agreed_at: user.privacy_agreed_at ?? now,
    profile_completed_at: user.profile_completed_at ?? now,
  }
  const { data, error } = await db().from('users').update(patch).eq('id', user.id).select().single()
  if (error) throw error
  return { user: data }
}
