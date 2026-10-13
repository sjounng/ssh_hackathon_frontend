import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from './supabase.js'

// 내 팀 · 결과물 제출 (기획서 기능 4 · 5). 규칙은 DB 함수(supabase/migrations/0004_team.sql)에 있다.
// 파일은 서버를 거치지 않는다: 서버가 서명된 업로드 주소를 주면 브라우저가 Storage에 직접 올리고
// (Vercel 함수는 요청 크기 4.5MB 제한), 저장할 때 DB 함수가 그 파일이 실제로 있는지·종류·크기를 확인한다

export const TEAM_ERRORS = {
  NOT_APPROVED: '선발된 참가자만 이용할 수 있습니다.',
  NOT_IN_TEAM: '아직 속한 팀이 없습니다.',
  NOT_LEADER: '팀장만 할 수 있습니다.',
  TEAM_LOCKED: '결과물 제출 마감 뒤에는 팀 정보를 바꿀 수 없습니다.',
  INVALID_TEAM_NAME: '팀명을 40자 이내로 입력해 주세요.',
  INVALID_ROLE: '역할을 40자 이내로 입력해 주세요.',
  SUBMIT_NOT_OPEN: '아직 결과물 제출 기간이 아닙니다.',
  SUBMIT_CLOSED: '결과물 제출이 마감되었습니다.',
  PROJECT_NAME_REQUIRED: '프로젝트명을 입력해 주세요.',
  TOO_LONG: '입력한 내용이 너무 깁니다. (프로젝트명 60자, 한 줄 소개 100자, 설명 5000자)',
  INVALID_URL: '링크는 http:// 또는 https://로 시작하는 주소로 입력해 주세요.',
  INVALID_GITHUB: 'GitHub 저장소 주소를 https://github.com/계정/저장소 형식으로 입력해 주세요.',
  INVALID_FILE: '올릴 수 없는 파일입니다. 발표자료는 PDF, 대표 이미지는 PNG·JPG·WEBP만 가능합니다.',
  FILE_NOT_FOUND: '파일이 아직 올라가지 않았습니다. 다시 올려 주세요.',
  FILE_TOO_LARGE: '파일이 너무 큽니다. 발표자료는 20MB, 대표 이미지는 5MB까지입니다.',
  INCOMPLETE: '필수 항목(프로토타입 링크, 발표자료, GitHub 저장소)을 모두 채워 주세요.',
  PLEDGE_REQUIRED: '제출 서약에 동의해 주세요.',
}

export class TeamError extends Error {
  constructor(code) {
    super(TEAM_ERRORS[code] ?? '처리하지 못했습니다.')
    this.code = code
  }
}

async function rpc(fn, params) {
  const { data, error } = await db().rpc(fn, params)
  if (error) {
    if (TEAM_ERRORS[error.message]) throw new TeamError(error.message)
    throw error
  }
  return data
}

const BUCKET = 'submissions'
// 올릴 수 있는 파일 (DB 함수 submission_save의 검사와 같은 값)
export const FILE_RULES = {
  slides: { types: { 'application/pdf': 'pdf' }, max: 20 * 1024 * 1024 },
  cover: { types: { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }, max: 5 * 1024 * 1024 },
}

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

export const teamActions = {
  rename: (u, b) => rpc('team_rename', { p_user: u, p_name: clip(b.name, 60) }),
  set_role: (u, b) => rpc('team_set_role', { p_user: u, p_role: clip(b.role, 60) }),

  // 업로드 주소 발급: 팀장·제출 기간을 먼저 확인한다
  upload_url: async (u, b) => {
    const rule = FILE_RULES[b.kind]
    const ext = rule?.types[b.type]
    if (!ext) throw new TeamError('INVALID_FILE')
    if (!(b.size > 0) || b.size > rule.max) throw new TeamError('FILE_TOO_LARGE')
    const team = await rpc('submission_team', { p_user: u })
    const path = `${team.id}/${b.kind}-${randomUUID()}.${ext}`
    const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path)
    if (error) throw error
    return { path, uploadUrl: data.signedUrl }
  },

  save_submission: async (u, b) => {
    const s = b.submission ?? {}
    const p = {
      project_name: clip(s.projectName, 200),
      tagline: clip(s.tagline, 300),
      description: clip(s.description, 6000),
      cover_image_path: clip(s.coverImagePath, 300),
      prototype_url: clip(s.prototypeUrl, 1000),
      slides_path: clip(s.slidesPath, 300),
      github_url: clip(s.githubUrl, 1000),
      demo_video_url: clip(s.demoVideoUrl, 1000),
      deploy_url: clip(s.deployUrl, 1000),
      pledge: s.pledge === true,
    }
    const r = await rpc('submission_save', { p_user: u, p, p_submit: b.submit === true })
    // 새 파일로 바뀐 옛 파일은 지운다 (실패해도 저장은 끝났으므로 무시)
    if (r.removed?.length) await db().storage.from(BUCKET).remove(r.removed).catch(() => {})
    return null
  },
}

// 제출 기간: before(행사 시작 전) / open / closed. 일정이 비어 있으면 그쪽 제한은 없다
function submitWindow(c, now = Date.now()) {
  if (c.event_start_at && now < Date.parse(c.event_start_at)) return 'before'
  if (c.submit_deadline_at && now > Date.parse(c.submit_deadline_at)) return 'closed'
  return 'open'
}

async function signed(path, download) {
  if (!path) return null
  const { data } = await db().storage.from(BUCKET).createSignedUrl(path, 60 * 60, download ? { download } : undefined)
  return data?.signedUrl ?? null
}

// 내 팀 화면 상태.
// stage: none(신청 안 함) / pending(선발 대기) / rejected / waiting(승인됐지만 팀 배정 전) / team
export async function getTeamState(userId) {
  const [cfg, app, member] = await Promise.all([
    db().from('event_config').select('team_assign_at, event_start_at, submit_deadline_at, team_min_size, team_max_size').single(),
    db().from('applications').select('kind, status').eq('user_id', userId).maybeSingle(),
    db().from('team_members').select('team_id').eq('user_id', userId).maybeSingle(),
  ])
  for (const r of [cfg, app, member]) if (r.error) throw r.error
  const c = cfg.data
  const schedule = { teamAssignAt: c.team_assign_at, eventStartAt: c.event_start_at, submitDeadlineAt: c.submit_deadline_at }

  if (!app.data) return { stage: 'none', schedule }
  if (app.data.status === 'rejected') return { stage: 'rejected', schedule }
  if (app.data.status !== 'approved') return { stage: 'pending', schedule }
  if (!member.data) return { stage: 'waiting', schedule }

  const [t, rows, sub] = await Promise.all([
    db().from('teams').select('id, name, origin, leader_id, presentation_order').eq('id', member.data.team_id).single(),
    db().from('team_members').select('user_id, role, joined_at, users(name, school, email)').eq('team_id', member.data.team_id).order('joined_at'),
    db().from('submissions').select('*').eq('team_id', member.data.team_id).maybeSingle(),
  ])
  for (const r of [t, rows, sub]) if (r.error) throw r.error
  const team = t.data
  // 운영진이 배정한 팀은 발표 시각 전에는 배정 대기로 보인다 (DB 함수 team_of와 같은 규칙)
  if (team.origin === 'assigned' && c.team_assign_at && Date.now() < Date.parse(c.team_assign_at)) {
    return { stage: 'waiting', schedule }
  }

  const window = submitWindow(c)
  const locked = c.submit_deadline_at && Date.now() > Date.parse(c.submit_deadline_at)
  const s = sub.data
  return {
    stage: 'team',
    schedule,
    myId: userId,
    team: {
      id: team.id,
      name: team.name,
      origin: team.origin,
      leaderId: team.leader_id,
      presentationOrder: team.presentation_order,
      members: rows.data.map((m) => ({ userId: m.user_id, name: m.users?.name, school: m.users?.school, email: m.users?.email, role: m.role ?? '' })),
    },
    teamSize: { min: c.team_min_size, max: c.team_max_size },
    canEditTeam: !locked,
    canRename: !locked && (!team.leader_id || team.leader_id === userId),
    isLeader: team.leader_id === userId,
    submitWindow: window,
    submission: s && {
      projectName: s.project_name,
      tagline: s.tagline ?? '',
      description: s.description ?? '',
      coverImagePath: s.cover_image_path,
      coverImageUrl: await signed(s.cover_image_path),
      prototypeUrl: s.prototype_url ?? '',
      slidesPath: s.slides_path,
      slidesUrl: await signed(s.slides_path),
      githubUrl: s.github_url ?? '',
      demoVideoUrl: s.demo_video_url ?? '',
      deployUrl: s.deploy_url ?? '',
      pledge: Boolean(s.pledge_agreed_at),
      submittedAt: s.submitted_at,
      updatedAt: s.updated_at,
    },
  }
}
