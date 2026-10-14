import 'server-only'
import { db } from './supabase.js'
import { getUserById } from './users.js'
import { getTeamState } from './team.js'

// 프로젝트 갤러리 (기획서 기능 6). 누가 무엇을 보는지는 설계 문서 권한표 '결과물 열람'을 따른다:
//   운영진 — 항상(임시 저장 포함) / 누구나 — 결과 공개 뒤 / 심사위원 — 심사 시작 뒤 / 참가자 — 그 전에는 자기 팀만
// 결과 공개 여부는 event_config.results_published_at (비어 있으면 비공개). 결과가 공개되면 팀원 이름도 함께 보인다

const BUCKET = 'submissions'
const URL_TTL = 60 * 60
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const must = ({ data, error }) => {
  if (error) throw error
  return data
}

// 지금 이 사람이 보는 범위: admin / public / judge / own / none
export function galleryScope(role, c, now = Date.now()) {
  if (role === 'admin') return 'admin'
  if (c.results_published_at && now >= Date.parse(c.results_published_at)) return 'public'
  if (role === 'judge' && (!c.judging_start_at || now >= Date.parse(c.judging_start_at))) return 'judge'
  if (role === 'participant') return 'own'
  return 'none'
}

// 역할은 세션이 아니라 DB의 현재 값으로 본다 (심사위원 권한을 거둔 직후에도 바로 반영)
async function context(user) {
  const [c, u] = await Promise.all([
    db().from('event_config').select('results_published_at, judging_start_at, results_announce_at').single().then(must),
    user ? getUserById(user.id) : null,
  ])
  const role = u?.role ?? null
  const scope = galleryScope(role, c)
  // 참가자는 내 팀 페이지에서 보이는 팀일 때만 (선발·팀 배정 발표 규칙을 그대로 따른다)
  let ownTeamId = null
  if (scope === 'own') {
    const t = await getTeamState(u.id)
    if (t.stage === 'team') ownTeamId = t.team.id
  }
  return { c, role, scope, ownTeamId }
}

const canSeeAwards = (scope) => scope === 'public' || scope === 'admin'

async function signedUrls(paths) {
  const list = paths.filter(Boolean)
  if (!list.length) return new Map()
  const { data } = await db().storage.from(BUCKET).createSignedUrls(list, URL_TTL)
  return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
}

function awardsByTeam(rows) {
  const m = new Map()
  for (const a of [...rows].sort((x, y) => (x.rank ?? 99) - (y.rank ?? 99))) {
    if (!m.has(a.team_id)) m.set(a.team_id, [])
    m.get(a.team_id).push(a.title)
  }
  return m
}

// 목록: 발표 순서대로 (순서가 없으면 뒤로, 그다음 프로젝트명)
export async function getGallery(user) {
  const { c, role, scope, ownTeamId } = await context(user)
  const base = { scope, role, schedule: { judgingStartAt: c.judging_start_at, resultsAnnounceAt: c.results_announce_at } }
  if (scope === 'none' || (scope === 'own' && !ownTeamId)) return { ...base, projects: [] }

  let q = db().from('submissions').select('team_id, project_name, tagline, cover_image_path, submitted_at, teams(name, presentation_order)')
  if (scope === 'own') q = q.eq('team_id', ownTeamId)
  else if (scope !== 'admin') q = q.not('submitted_at', 'is', null)
  const [subs, awards] = await Promise.all([
    q.then(must),
    canSeeAwards(scope) ? db().from('awards').select('team_id, title, rank').then(must) : [],
  ])
  const covers = await signedUrls(subs.map((s) => s.cover_image_path))
  const awardsOf = awardsByTeam(awards)

  const projects = subs
    .map((s) => ({
      teamId: s.team_id,
      projectName: s.project_name,
      tagline: s.tagline ?? '',
      teamName: s.teams?.name ?? null,
      order: s.teams?.presentation_order ?? null,
      coverUrl: covers.get(s.cover_image_path) ?? null,
      draft: !s.submitted_at,
      awards: awardsOf.get(s.team_id) ?? [],
    }))
    .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.projectName.localeCompare(b.projectName, 'ko'))
  return { ...base, projects }
}

// 상세. 볼 수 없거나 없으면 null (다른 팀 결과물이 있는지조차 드러나지 않게 같은 응답)
export async function getProject(user, teamId) {
  if (!UUID.test(teamId ?? '')) return null
  const { scope, ownTeamId } = await context(user)
  if (scope === 'none' || (scope === 'own' && teamId !== ownTeamId)) return null

  const s = must(await db().from('submissions').select('*').eq('team_id', teamId).maybeSingle())
  if (!s || (!s.submitted_at && scope !== 'admin' && scope !== 'own')) return null

  const [team, members, awards] = await Promise.all([
    db().from('teams').select('name, presentation_order, leader_id').eq('id', teamId).single().then(must),
    db().from('team_members').select('user_id, role, joined_at, users(name, school)').eq('team_id', teamId).order('joined_at').then(must),
    canSeeAwards(scope) ? db().from('awards').select('team_id, title, rank').eq('team_id', teamId).then(must) : [],
  ])
  const urls = await signedUrls([s.cover_image_path, s.slides_path])

  return {
    scope,
    teamId,
    projectName: s.project_name,
    tagline: s.tagline ?? '',
    description: s.description ?? '',
    coverUrl: urls.get(s.cover_image_path) ?? null,
    slidesUrl: urls.get(s.slides_path) ?? null,
    prototypeUrl: s.prototype_url,
    githubUrl: s.github_url,
    demoVideoUrl: s.demo_video_url,
    deployUrl: s.deploy_url,
    submittedAt: s.submitted_at,
    draft: !s.submitted_at,
    teamName: team.name,
    order: team.presentation_order,
    members: members.map((m) => ({ name: m.users?.name ?? '', school: m.users?.school ?? null, role: m.role ?? '', leader: m.user_id === team.leader_id })),
    awards: awardsByTeam(awards).get(teamId) ?? [],
  }
}
