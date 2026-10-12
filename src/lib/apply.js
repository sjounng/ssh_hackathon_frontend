import 'server-only'
import { db } from './supabase.js'

// 참가 신청 (기획서 기능 3). 규칙은 DB 함수(supabase/migrations/0002_apply.sql)에 있고, 여기서는 호출·조회만 한다

// DB 함수가 내는 오류 코드 → 사용자 안내
export const APPLY_ERRORS = {
  APPLY_CLOSED: '신청 기간이 아닙니다.',
  USER_NOT_FOUND: '사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.',
  NOT_PARTICIPANT: '심사위원·운영진 계정은 참가 신청을 할 수 없습니다.',
  PROFILE_INCOMPLETE: '먼저 내 정보를 입력해 주세요.',
  INCOMPLETE: '필수 항목을 모두 입력해 주세요.',
  ALREADY_DECIDED: '선발 결과가 나온 뒤에는 수정할 수 없습니다.',
  ALREADY_IN_TEAM: '이미 팀에 속해 있습니다.',
  HAS_SOLO_APPLICATION: '제출한 개인 신청이 있습니다. 팀으로 신청하려면 먼저 개인 신청을 취소해 주세요.',
  NO_APPLICATION: '신청 내역이 없습니다.',
  INVALID_TEAM_NAME: '팀명을 40자 이내로 입력해 주세요.',
  CODE_NOT_FOUND: '참가 코드를 찾을 수 없습니다. 코드를 다시 확인해 주세요.',
  TEAM_ALREADY_SUBMITTED: '팀 신청이 이미 제출되었습니다. 팀 구성을 바꾸려면 대표가 제출을 취소해야 합니다.',
  TEAM_FULL: '팀 정원이 가득 찼습니다.',
  NOT_IN_TEAM: '속한 팀이 없습니다.',
  NOT_LEADER: '팀 대표만 할 수 있습니다.',
  LEADER_HAS_MEMBERS: '팀원이 있는 동안에는 대표가 나갈 수 없습니다.',
  TEAM_SIZE: '팀 인원 조건을 충족하지 않습니다.',
  MEMBER_INCOMPLETE: '모든 팀원이 자기 역할을 작성해야 제출할 수 있습니다.',
  TEAM_NOT_SUBMITTED: '아직 제출하지 않은 팀입니다.',
}

export class ApplyError extends Error {
  constructor(code) {
    super(APPLY_ERRORS[code] ?? '처리하지 못했습니다.')
    this.code = code
  }
}

async function rpc(fn, params) {
  const { data, error } = await db().rpc(fn, params)
  if (error) {
    if (APPLY_ERRORS[error.message]) throw new ApplyError(error.message)
    throw error
  }
  return data
}

export const applyActions = {
  save_solo: (u, b) => rpc('apply_save_solo', { p_user: u, p_role: b.desiredRole, p_stack: b.techStack, p_motivation: b.motivation, p_submit: b.submit === true }),
  cancel_solo: (u) => rpc('apply_cancel_solo', { p_user: u }),
  create_team: (u, b) => rpc('apply_create_team', { p_user: u, p_name: b.name }),
  join_team: (u, b) => rpc('apply_join_team', { p_user: u, p_code: b.code }),
  save_member: (u, b) => rpc('apply_save_member', { p_user: u, p_role: b.role, p_stack: b.techStack, p_motivation: b.motivation }),
  rename_team: (u, b) => rpc('apply_rename_team', { p_user: u, p_name: b.name }),
  leave_team: (u) => rpc('apply_leave_team', { p_user: u }),
  submit_team: (u) => rpc('apply_submit_team', { p_user: u }),
  withdraw_team: (u) => rpc('apply_withdraw_team', { p_user: u }),
}

// 입력 정리: 기술 스택은 쉼표로 나눈 문자열이나 배열 모두 받고, 길이를 제한한다
export function normalizeApplyBody(body) {
  const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
  const stack = Array.isArray(body.techStack) ? body.techStack : String(body.techStack ?? '').split(',')
  return {
    ...body,
    desiredRole: clip(body.desiredRole, 40),
    role: clip(body.role, 40),
    motivation: clip(body.motivation, 1000),
    name: clip(body.name, 40),
    code: clip(body.code, 12),
    techStack: [...new Set(stack.map((s) => String(s).trim().slice(0, 30)).filter(Boolean))].slice(0, 10),
  }
}

// 신청 화면에 필요한 상태: 신청 기간, 내 신청, 팀과 팀원
export async function getApplyState(userId) {
  const [cfg, app, member] = await Promise.all([
    db().from('event_config').select('apply_open_at, apply_close_at, team_min_size, team_max_size').single(),
    db().from('applications').select('*').eq('user_id', userId).maybeSingle(),
    db().from('team_members').select('team_id').eq('user_id', userId).maybeSingle(),
  ])
  for (const r of [cfg, app, member]) if (r.error) throw r.error

  const c = cfg.data
  const now = Date.now()
  const isOpen =
    (!c.apply_open_at || now >= Date.parse(c.apply_open_at)) && (!c.apply_close_at || now <= Date.parse(c.apply_close_at))

  let team = null
  if (member.data) {
    const { data: t, error: e1 } = await db()
      .from('teams')
      .select('id, name, origin, join_code, leader_id, application_submitted_at')
      .eq('id', member.data.team_id)
      .single()
    if (e1) throw e1
    const { data: rows, error: e2 } = await db()
      .from('team_members')
      .select('user_id, role, joined_at, users(name, school)')
      .eq('team_id', t.id)
      .order('joined_at')
    if (e2) throw e2
    team = {
      id: t.id,
      name: t.name,
      origin: t.origin,
      joinCode: t.origin === 'applied' ? t.join_code : null,
      leaderId: t.leader_id,
      submittedAt: t.application_submitted_at,
      members: rows.map((m) => ({ userId: m.user_id, name: m.users?.name, school: m.users?.school, role: m.role })),
    }
  }

  const a = app.data
  return {
    window: { openAt: c.apply_open_at, closeAt: c.apply_close_at, isOpen },
    teamSize: { min: c.team_min_size, max: c.team_max_size },
    application: a && {
      kind: a.kind,
      status: a.status,
      desiredRole: a.desired_role ?? '',
      techStack: a.tech_stack ?? [],
      motivation: a.motivation ?? '',
      submittedAt: a.submitted_at,
    },
    team,
  }
}
