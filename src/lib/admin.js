import 'server-only'
import { currentUser } from '../auth.js'
import { db } from './supabase.js'
import { getUserById } from './users.js'
import { mailSummary } from './mail.js'

// 관리자 (기획서 기능 9). 여러 행을 함께 바꾸는 작업은 DB 함수(0003_admin.sql), 단순 조회·수정은 여기서 한다

// 운영진 확인: 세션 토큰의 역할이 아니라 DB의 현재 역할로 확인한다 (역할을 바꾼 직후에도 바로 반영)
export async function requireAdmin() {
  const me = await currentUser()
  if (!me) return null
  const user = await getUserById(me.id)
  return user?.role === 'admin' ? user : null
}

export const ADMIN_ERRORS = {
  NOT_ADMIN: '운영진만 할 수 있습니다.',
  INVALID_STATUS: '잘못된 상태입니다.',
  NO_APPLICATION: '선택한 신청이 없습니다.',
  NOT_SUBMITTED: '제출되지 않은(작성 중) 신청이 섞여 있습니다.',
  ALREADY_ASSIGNED: '이미 팀에 배정된 참가자는 승인을 취소할 수 없습니다. 먼저 팀에서 빼 주세요.',
  NO_MEMBERS: '팀원을 한 명 이상 골라 주세요.',
  LEADER_NOT_MEMBER: '팀장은 팀원 중에서 골라야 합니다.',
  NOT_APPROVED_SOLO: '승인된 개인 참가자만 배정할 수 있습니다.',
  ALREADY_IN_TEAM: '이미 팀에 속한 참가자가 있습니다.',
  TEAM_NOT_FOUND: '팀을 찾을 수 없습니다.',
  NOT_ASSIGNED_TEAM: '팀으로 신청한 팀의 구성은 바꿀 수 없습니다.',
  NOT_IN_TEAM: '그 팀의 팀원이 아닙니다.',
  INVALID_INPUT: '입력값을 확인해 주세요.',
  SELF_ROLE: '자기 자신의 운영진 권한은 해제할 수 없습니다.',
}

export class AdminError extends Error {
  constructor(code) {
    super(ADMIN_ERRORS[code] ?? '처리하지 못했습니다.')
    this.code = code
  }
}

async function rpc(fn, params) {
  const { data, error } = await db().rpc(fn, params)
  if (error) {
    if (ADMIN_ERRORS[error.message]) throw new AdminError(error.message)
    throw error
  }
  return data
}

const must = ({ data, error }) => {
  if (error) throw error
  return data
}

// ── 조회: 관리자 화면 전체 데이터 (규모가 수백 명 수준이라 한 번에 읽는다) ──
export async function getAdminData() {
  const [config, apps, teams, members, users, invites] = await Promise.all([
    db().from('event_config').select('*').single().then(must),
    db().from('applications').select('id, user_id, kind, team_id, desired_role, tech_stack, motivation, status, submitted_at, decided_at').order('submitted_at', { ascending: true, nullsFirst: false }).then(must),
    db().from('teams').select('id, name, origin, join_code, leader_id, application_submitted_at, presentation_order, created_at').order('created_at').then(must),
    db().from('team_members').select('team_id, user_id, role, joined_at').order('joined_at').then(must),
    db().from('users').select('id, email, name, school, role, student_id, phone, created_at').order('created_at').then(must),
    db().from('invited_emails').select('email, role, note, created_at').order('created_at').then(must),
  ])
  const data = { config, applications: apps, teams, members, users, invites }
  return { ...data, mail: await mailSummary(data) }
}

// ── 선발·팀 (DB 함수) ──
export const decide = (admin, ids, status) => rpc('admin_decide', { p_admin: admin, p_application_ids: ids, p_status: status })
export const createTeam = (admin, name, userIds, leader) => rpc('admin_create_team', { p_admin: admin, p_name: name, p_user_ids: userIds, p_leader: leader || null })
export const addMember = (admin, team, user) => rpc('admin_add_member', { p_admin: admin, p_team: team, p_user: user })
export const removeMember = (admin, team, user) => rpc('admin_remove_member', { p_admin: admin, p_team: team, p_user: user })
export const setLeader = (admin, team, user) => rpc('admin_set_leader', { p_admin: admin, p_team: team, p_user: user })
export const setPresentationOrder = (admin, teamIds) => rpc('admin_set_presentation_order', { p_admin: admin, p_team_ids: teamIds })

// ── 일정 ──
const DATE_FIELDS = [
  'apply_open_at', 'apply_close_at', 'selection_announce_at', 'team_assign_at', 'event_start_at', 'event_end_at',
  'submit_deadline_at', 'judging_start_at', 'judging_end_at', 'results_announce_at',
]

export async function saveConfig(input) {
  const patch = {}
  for (const f of DATE_FIELDS) {
    if (!(f in input)) continue
    const v = input[f]
    if (v === null || v === '') patch[f] = null
    else if (Number.isNaN(Date.parse(v))) throw new AdminError('INVALID_INPUT')
    else patch[f] = new Date(v).toISOString()
  }
  for (const f of ['team_min_size', 'team_max_size']) {
    if (!(f in input)) continue
    const n = Number(input[f])
    if (!Number.isInteger(n) || n < 1 || n > 10) throw new AdminError('INVALID_INPUT')
    patch[f] = n
  }
  if ((patch.team_min_size ?? 0) > (patch.team_max_size ?? Infinity)) throw new AdminError('INVALID_INPUT')
  if (patch.apply_open_at && patch.apply_close_at && patch.apply_open_at > patch.apply_close_at) throw new AdminError('INVALID_INPUT')
  return must(await db().from('event_config').update(patch).eq('id', true).select().single())
}

// ── 계정 ──
export async function setRole(admin, userId, role) {
  if (!['participant', 'judge', 'admin'].includes(role)) throw new AdminError('INVALID_INPUT')
  if (userId === admin && role !== 'admin') throw new AdminError('SELF_ROLE')
  return must(await db().from('users').update({ role }).eq('id', userId).select('id, role').single())
}

export async function addInvite(email, role, note) {
  const e = String(email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || !['judge', 'admin'].includes(role)) throw new AdminError('INVALID_INPUT')
  must(await db().from('invited_emails').upsert({ email: e, role, note: String(note ?? '').trim().slice(0, 100) || null }))
  // 이미 가입한 계정이면 역할도 바로 맞춘다 (운영진은 내리지 않음)
  must(await db().from('users').update({ role }).eq('email', e).neq('role', 'admin'))
}

export async function removeInvite(email) {
  must(await db().from('invited_emails').delete().eq('email', String(email ?? '').toLowerCase()))
}

// ── 명단 내보내기 (엑셀에서 한글이 깨지지 않도록 BOM 포함 CSV) ──
export async function applicationsCsv() {
  const { applications, teams, users, members } = await getAdminData()
  const userById = new Map(users.map((u) => [u.id, u]))
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const teamOf = new Map(members.map((m) => [m.user_id, teamById.get(m.team_id)]))
  const SCHOOL = { hanyang: '한양대', skku: '성균관대', sogang: '서강대' }
  const STATUS = { draft: '작성 중', submitted: '제출', approved: '승인', rejected: '거절' }
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['이름', '학교', '학번', '이메일', '연락처', '유형', '상태', '팀', '희망 역할', '기술 스택', '지원 동기', '제출 시각']
  const rows = applications.map((a) => {
    const u = userById.get(a.user_id) ?? {}
    return [
      u.name, SCHOOL[u.school], u.student_id, u.email, u.phone,
      a.kind === 'team' ? '팀' : '개인', STATUS[a.status], teamOf.get(a.user_id)?.name ?? '',
      a.desired_role, (a.tech_stack ?? []).join(', '), a.motivation, a.submitted_at ?? '',
    ]
  })
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
}
