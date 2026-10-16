import 'server-only'
import { db } from './supabase.js'
import { getUserById } from './users.js'

// 결과 발표 (기획서 기능 8). 운영진이 관리자 > 결과에서 공개하면(event_config.results_published_at) 누구나 수상 팀을 본다.
// 공개 전에는 운영진만 미리 본다. 점수와 전체 순위는 공개하지 않고 수상 팀만 보여 준다

const must = ({ data, error }) => {
  if (error) throw error
  return data
}

export async function getResults(user) {
  const [c, u] = await Promise.all([
    db().from('event_config').select('results_published_at, results_announce_at').single().then(must),
    user ? getUserById(user.id) : null,
  ])
  const published = Boolean(c.results_published_at && Date.now() >= Date.parse(c.results_published_at))
  const base = { published, preview: !published && u?.role === 'admin', announceAt: c.results_announce_at, publishedAt: c.results_published_at }
  if (!published && !base.preview) return { ...base, awards: [] }

  const awards = must(await db().from('awards').select('id, title, rank, team_id, created_at').order('rank', { nullsFirst: false }).order('created_at'))
  const teamIds = [...new Set(awards.map((a) => a.team_id))]
  const [subs, teams] = teamIds.length
    ? await Promise.all([
      db().from('submissions').select('team_id, project_name, tagline, cover_image_path').in('team_id', teamIds).then(must),
      db().from('teams').select('id, name').in('id', teamIds).then(must),
    ])
    : [[], []]
  const paths = subs.map((s) => s.cover_image_path).filter(Boolean)
  const signed = paths.length ? (await db().storage.from('submissions').createSignedUrls(paths, 60 * 60)).data ?? [] : []
  const cover = new Map(signed.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
  const sub = new Map(subs.map((s) => [s.team_id, s]))
  const team = new Map(teams.map((t) => [t.id, t]))

  return {
    ...base,
    awards: awards.map((a) => {
      const s = sub.get(a.team_id)
      return {
        id: a.id,
        title: a.title,
        teamId: a.team_id,
        projectName: s?.project_name ?? '',
        tagline: s?.tagline ?? '',
        teamName: team.get(a.team_id)?.name ?? null,
        coverUrl: cover.get(s?.cover_image_path) ?? null,
      }
    }),
  }
}
