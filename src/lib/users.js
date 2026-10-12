import 'server-only'
import { db } from './supabase.js'
import { validateProfile } from './profile.js'

export const SCHOOL_LABEL = { hanyang: '한양대학교', skku: '성균관대학교', sogang: '서강대학교' }

// 로그인 허용 여부: 학교 도메인이면 소속 학교, 초청 목록에 있으면 초청 역할. 둘 다 아니면 null(차단)
export async function resolveAccess(email) {
  const domain = email.split('@')[1]
  const { data: d, error: e1 } = await db().from('allowed_domains').select('school').eq('domain', domain).maybeSingle()
  if (e1) throw e1
  if (d) return { school: d.school, role: null }

  const { data: inv, error: e2 } = await db().from('invited_emails').select('role').eq('email', email).maybeSingle()
  if (e2) throw e2
  if (inv) return { school: null, role: inv.role }
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

// 내 정보 화면용: 프로필 + 신청 상태 + 소속 팀
export async function getMyOverview(userId) {
  const [user, app, member] = await Promise.all([
    getUserById(userId),
    db().from('applications').select('kind, status, submitted_at, decided_at').eq('user_id', userId).maybeSingle(),
    db().from('team_members').select('role, teams(id, name, origin, leader_id)').eq('user_id', userId).maybeSingle(),
  ])
  if (app.error) throw app.error
  if (member.error) throw member.error
  return { user, application: app.data, team: member.data?.teams ?? null }
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
