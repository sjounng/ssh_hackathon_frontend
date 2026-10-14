import 'server-only'
import { db } from './supabase.js'
import { getUserById } from './users.js'

// 심사 (기획서 기능 7). 심사위원이 최종 제출한 팀마다 평가 항목별 점수를 매긴다.
// 규칙은 DB 함수 judge_save_scores(0008_judging.sql)에 있고, 여기서는 호출·조회만 한다.
// 심사위원은 자기 점수만 보고, 다른 심사위원 점수와 순위는 운영진만 본다 (관리자 > 심사)

export const REVIEW_ERRORS = {
  NOT_JUDGE: '심사위원 계정만 점수를 매길 수 있습니다.',
  JUDGING_CLOSED: '심사 기간이 아닙니다.',
  NOT_SUBMITTED: '최종 제출하지 않은 팀입니다.',
  CRITERION_NOT_FOUND: '평가 항목이 바뀌었습니다. 새로고침한 뒤 다시 매겨 주세요.',
  OUT_OF_RANGE: '점수가 항목의 범위를 벗어났습니다.',
  INVALID_INPUT: '입력값을 확인해 주세요.',
}

export class ReviewError extends Error {
  constructor(code) {
    super(REVIEW_ERRORS[code] ?? '처리하지 못했습니다.')
    this.code = code
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const must = ({ data, error }) => {
  if (error) throw error
  return data
}

// 심사 기간: before / open / closed. 비어 있으면 그쪽 제한은 없다 (DB 함수와 같은 규칙)
function judgingWindow(c, now = Date.now()) {
  if (c.judging_start_at && now < Date.parse(c.judging_start_at)) return 'before'
  if (c.judging_end_at && now > Date.parse(c.judging_end_at)) return 'closed'
  return 'open'
}

// 심사 화면 상태. 심사위원이 아니면 역할만 돌려준다
export async function getReviewState(userId) {
  const [c, u] = await Promise.all([
    db().from('event_config').select('judging_start_at, judging_end_at').single().then(must),
    getUserById(userId),
  ])
  const base = { role: u?.role ?? null, window: judgingWindow(c), schedule: { startAt: c.judging_start_at, endAt: c.judging_end_at } }
  if (base.role !== 'judge') return base

  const criteria = must(await db().from('criteria').select('id, name, description, min_score, max_score').order('sort_order').order('created_at'))
  // 심사 시작 전에는 프로젝트 목록을 주지 않는다 (갤러리와 같은 규칙)
  if (base.window === 'before') return { ...base, criteria, teams: [] }

  const [subs, mine] = await Promise.all([
    db().from('submissions')
      .select('team_id, project_name, tagline, prototype_url, github_url, slides_path, teams(name, presentation_order)')
      .not('submitted_at', 'is', null).then(must),
    db().from('scores').select('team_id, criterion_id, score').eq('judge_id', userId).then(must),
  ])
  const paths = subs.map((s) => s.slides_path).filter(Boolean)
  const signed = paths.length ? (await db().storage.from('submissions').createSignedUrls(paths, 60 * 60)).data ?? [] : []
  const slides = new Map(signed.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))

  const teams = subs
    .map((s) => ({
      teamId: s.team_id,
      projectName: s.project_name,
      tagline: s.tagline ?? '',
      teamName: s.teams?.name ?? null,
      order: s.teams?.presentation_order ?? null,
      prototypeUrl: s.prototype_url,
      githubUrl: s.github_url,
      slidesUrl: slides.get(s.slides_path) ?? null,
      scores: Object.fromEntries(mine.filter((x) => x.team_id === s.team_id).map((x) => [x.criterion_id, Number(x.score)])),
    }))
    .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.projectName.localeCompare(b.projectName, 'ko'))
  return { ...base, criteria, teams }
}

// 점수 저장: { teamId, scores: [{ criterionId, score }] }
export async function saveScores(userId, body) {
  const teamId = String(body?.teamId ?? '')
  const scores = Array.isArray(body?.scores) ? body.scores : []
  if (!UUID.test(teamId) || !scores.length || scores.some((s) => !UUID.test(String(s?.criterionId)) || !Number.isFinite(Number(s?.score)))) {
    throw new ReviewError('INVALID_INPUT')
  }
  const { error } = await db().rpc('judge_save_scores', {
    p_judge: userId,
    p_team: teamId,
    p_scores: scores.map((s) => ({ criterion_id: s.criterionId, score: Number(s.score) })),
  })
  if (error) {
    if (REVIEW_ERRORS[error.message]) throw new ReviewError(error.message)
    if (error.code === '22P02') throw new ReviewError('INVALID_INPUT')
    throw error
  }
}
