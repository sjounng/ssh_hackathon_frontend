import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { EVENT, MAIL } from '../content.js'
import { SCHOOL_SHORT } from './labels.js'
import { formatEventDates, formatKstDateTime } from './schedule.js'
import { db } from './supabase.js'

// 안내 메일 (기획서 기능 9): 선발 결과 · 팀 배정. Resend로 보내고 email_logs에 남긴다.
// 한 사람에게 같은 내용(ref)을 두 번 보내지 않는다 — 선발 결과는 결정(approved/rejected), 팀 배정은 팀 id가 ref다.
// 동시에 두 번 눌러도 한 번만 나가도록, 보낼 대상은 DB 함수 mail_claim이 잡는다 (0006_mail.sql).
// 환경변수: RESEND_API_KEY, MAIL_FROM

export const MAIL_KINDS = {
  selection_result: ['approvedSolo', 'approvedTeam', 'rejected'],
  team_assignment: ['assignment'],
}
const TEMPLATE_LABEL = { approvedSolo: '승인 · 개인 신청', approvedTeam: '승인 · 팀 신청', rejected: '거절', assignment: '팀 배정' }

export const MAIL_ERRORS = {
  INVALID_KIND: '알 수 없는 메일 종류입니다.',
  NOT_CONFIGURED: '메일 발송 설정(RESEND_API_KEY, MAIL_FROM)이 없습니다.',
  PLACEHOLDER: '메일 문구에 채우지 않은 자리표시가 있어 보낼 수 없습니다. src/content.js를 확인해 주세요:',
  SEND_FAILED: '메일을 보내지 못했습니다:',
}

export class MailError extends Error {
  constructor(code, detail) {
    super([MAIL_ERRORS[code] ?? '메일을 보내지 못했습니다.', detail].filter(Boolean).join(' '))
    this.code = code
  }
}

export function mailConfig() {
  const from = process.env.MAIL_FROM?.trim() || null
  // 도메인 인증 전 테스트 주소(onboarding@resend.dev)는 Resend 계정 주인의 메일로만 보낼 수 있다
  return { ready: Boolean(process.env.RESEND_API_KEY && from), from, testing: /@resend\.dev>?$/.test(from ?? '') }
}

// 메일 속 링크의 주소: 운영 도메인(Vercel이 넣어 주는 값)이 있으면 그쪽, 없으면 요청이 온 주소
function siteUrl(origin) {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return prod ? `https://${prod}` : origin ?? ''
}

// ───────────────────────── 대상 ─────────────────────────
const must = ({ data, error }) => {
  if (error) throw error
  return data
}

async function loadData() {
  const [config, applications, teams, members, users] = await Promise.all([
    db().from('event_config').select('*').single().then(must),
    db().from('applications').select('user_id, kind, team_id, status').then(must),
    db().from('teams').select('id, name, origin, leader_id').then(must),
    db().from('team_members').select('team_id, user_id, role, joined_at').order('joined_at').then(must),
    db().from('users').select('id, email, name, school').then(must),
  ])
  return { config, applications, teams, members, users }
}

const teamLabel = (name) => (!name ? '새 팀' : name.endsWith('팀') ? name : `${name} 팀`)

function commonVars(config) {
  return {
    event: EVENT.name,
    eventDates: config.event_start_at ? formatEventDates(config.event_start_at, config.event_end_at) : '추후 안내',
    teamAssignAt: formatKstDateTime(config.team_assign_at) ?? '추후',
  }
}

// 이 종류의 메일을 받을 사람: [{ userId, email, name, ref, template, vars }]
// d: { config, applications, teams, members, users } — 관리자 화면 데이터(getAdminData)와 같은 모양
function buildTargets(kind, d) {
  const user = new Map(d.users.map((u) => [u.id, u]))
  const team = new Map(d.teams.map((t) => [t.id, t]))
  const base = commonVars(d.config)
  const out = []

  if (kind === 'selection_result') {
    for (const a of d.applications) {
      if (a.status !== 'approved' && a.status !== 'rejected') continue
      const u = user.get(a.user_id)
      const template = a.status === 'rejected' ? 'rejected' : a.kind === 'team' ? 'approvedTeam' : 'approvedSolo'
      out.push({ userId: a.user_id, email: u?.email, name: u?.name, ref: a.status, template, vars: { ...base, name: u?.name, team: teamLabel(team.get(a.team_id)?.name) } })
    }
  } else {
    // 운영진이 배정한 팀의 팀원 (팀으로 신청한 팀은 이미 팀을 알고 있다)
    for (const t of d.teams) {
      if (t.origin !== 'assigned') continue
      const ms = d.members.filter((m) => m.team_id === t.id)
      const lines = ms.map((m) => {
        const u = user.get(m.user_id)
        return [`${u?.name ?? ''} (${SCHOOL_SHORT[u?.school] ?? '외부'})`, m.role || '역할 미정', u?.email, t.leader_id === m.user_id && '팀장']
          .filter(Boolean).join(' · ')
      })
      for (const m of ms) {
        const u = user.get(m.user_id)
        out.push({ userId: m.user_id, email: u?.email, name: u?.name, ref: t.id, template: 'assignment', vars: { ...base, name: u?.name, team: teamLabel(t.name), members: lines } })
      }
    }
  }
  return out.filter((t) => t.email)
}

// ───────────────────────── 문구 ─────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (Array.isArray(vars[k]) ? vars[k].join(', ') : vars[k] ?? ''))

// content.js의 MAIL 문구에 값을 채워 { subject, text, html }을 만든다. 받는 사람이 입력한 값(이름·팀명)은 HTML 이스케이프한다
function renderMail(template, vars, site) {
  const tpl = MAIL[template]
  const blocks = tpl.body.map((p) => {
    const list = vars[/^\{(\w+)\}$/.exec(p)?.[1]]
    return Array.isArray(list) ? { list } : { text: fill(p, vars) }
  })
  const action = tpl.action && { label: tpl.action.label, url: `${site}${tpl.action.path}` }
  const footer = MAIL.footer.map((f) => fill(f, vars))
  const subject = fill(tpl.subject, vars)

  const text = [
    ...blocks.map((b) => (b.list ? b.list.map((l) => `- ${l}`).join('\n') : b.text)),
    action && `${action.label}: ${action.url}`,
    '—',
    ...footer,
  ].filter(Boolean).join('\n\n')

  const P = 'margin:0 0 16px;font-size:15px;line-height:1.7;color:#1d1d1f'
  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:32px 16px;background:#f2f2f4;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-radius:16px">
<p style="margin:0 0 24px;font-size:13px;font-weight:600;color:#6e6e73">${esc(vars.event)}</p>
${blocks.map((b) => (b.list ? `<ul style="${P};padding-left:20px">${b.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : `<p style="${P}">${esc(b.text)}</p>`)).join('\n')}
${action ? `<p style="margin:24px 0 8px"><a href="${esc(action.url)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#111111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${esc(action.label)}</a></p>` : ''}
<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e5e5ea;font-size:12px;line-height:1.6;color:#8e8e93">${footer.map(esc).join('<br>')}</p>
</div></body></html>`

  return { subject, text, html }
}

// 문구(받는 사람마다 달라지는 값은 빼고)에 남은 [자리표시]. 하나라도 있으면 일괄 발송을 막는다
function placeholdersOf(kind) {
  const base = { event: EVENT.name }
  const strings = MAIL_KINDS[kind].flatMap((k) => [MAIL[k].subject, ...MAIL[k].body, MAIL[k].action?.label ?? '']).concat(MAIL.footer)
  return [...new Set(strings.flatMap((s) => fill(s, base).match(/\[[^\]]+\]/g) ?? []))]
}

// 문구마다 견본 한 통: 실제 대상이 있으면 그 사람 것, 없으면 예시 값
function samplesOf(kind, d) {
  const targets = buildTargets(kind, d)
  const example = {
    ...commonVars(d.config),
    name: '홍길동',
    team: '예시 팀',
    members: ['홍길동 (한양대) · 프론트엔드 · hong@hanyang.ac.kr · 팀장', '김하늘 (성균관대) · 디자인 · sky@g.skku.edu'],
  }
  return MAIL_KINDS[kind].map((template) => ({
    template,
    label: TEMPLATE_LABEL[template],
    vars: targets.find((t) => t.template === template)?.vars ?? example,
  }))
}

// ───────────────────────── 발송 ─────────────────────────
const RESEND_BATCH = 'https://api.resend.com/emails/batch'
const BATCH_SIZE = 100 // Resend 일괄 발송 한도
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 한 번에 100통까지. 응답 data[i].id가 i번째 메일의 id. 같은 Idempotency-Key로 다시 보내면 Resend가 한 번만 보낸다
async function resendBatch(messages, idempotencyKey) {
  const { from } = mailConfig()
  const request = () => fetch(RESEND_BATCH, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(messages.map((m) => ({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text }))),
  })
  let res = await request()
  // 초당 요청 수 제한에 걸리면 잠깐 쉬고 한 번 더
  if (res.status === 429) {
    await sleep(Math.min(Number(res.headers.get('retry-after')) || 1, 5) * 1000)
    res = await request()
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message ?? `Resend 응답 ${res.status}`)
  return body.data ?? []
}

// 남은 대상에게 보내기: 대상을 잡고(queued) → 100통씩 보내고 → 결과를 남긴다. 반환 { sent, failed }
export async function sendMail(adminId, kind, origin) {
  if (!MAIL_KINDS[kind]) throw new MailError('INVALID_KIND')
  if (!mailConfig().ready) throw new MailError('NOT_CONFIGURED')
  const holes = placeholdersOf(kind)
  if (holes.length) throw new MailError('PLACEHOLDER', holes.join(' '))

  const targets = buildTargets(kind, await loadData())
  const claimed = must(await db().rpc('mail_claim', {
    p_admin: adminId,
    p_kind: kind,
    p_rows: targets.map((t) => ({ user_id: t.userId, to_email: t.email, ref: t.ref })),
  }))
  const byUser = new Map(targets.map((t) => [t.userId, t]))
  const site = siteUrl(origin)
  const results = []

  for (let i = 0; i < claimed.length; i += BATCH_SIZE) {
    const chunk = claimed.slice(i, i + BATCH_SIZE)
    if (i) await sleep(600)
    try {
      const messages = chunk.map((l) => {
        const t = byUser.get(l.user_id)
        return { to: l.to_email, ...renderMail(t.template, t.vars, site) }
      })
      const key = createHash('sha256').update(chunk.map((l) => l.id).join(',')).digest('hex')
      const ids = await resendBatch(messages, key)
      chunk.forEach((l, j) => results.push({ id: l.id, status: 'sent', provider_id: ids[j]?.id ?? null, error: null }))
    } catch (e) {
      chunk.forEach((l) => results.push({ id: l.id, status: 'failed', provider_id: null, error: String(e.message).slice(0, 500) }))
    }
  }

  if (results.length) must(await db().rpc('mail_finish', { p_admin: adminId, p_results: results }))
  const sent = results.filter((r) => r.status === 'sent').length
  return { sent, failed: results.length - sent }
}

// 나에게 테스트 발송: 이 종류의 문구를 한 통씩(선발 결과는 세 통) 운영진 본인에게 보낸다. 기록은 남기지 않는다
export async function sendTestMail(admin, kind, origin) {
  if (!MAIL_KINDS[kind]) throw new MailError('INVALID_KIND')
  if (!mailConfig().ready) throw new MailError('NOT_CONFIGURED')
  const site = siteUrl(origin)
  const messages = samplesOf(kind, await loadData()).map((s) => {
    const m = renderMail(s.template, s.vars, site)
    return { ...m, to: admin.email, subject: `[테스트] ${m.subject}` }
  })
  try {
    await resendBatch(messages, `test-${randomUUID()}`)
  } catch (e) {
    throw new MailError('SEND_FAILED', e.message)
  }
  return { test: true, sent: messages.length, to: admin.email }
}

// ───────────────────────── 관리자 화면 ─────────────────────────
// 종류별 대상·보냄·남음·실패, 미리보기, 막는 자리표시. d는 getAdminData의 데이터
export async function mailSummary(d) {
  const { from, ready, testing } = mailConfig()
  const { data: logs, error } = await db().from('email_logs').select('kind, user_id, ref, status, error, created_at, sent_at').order('created_at')
  if (error) return { ready: false, from, testing, error: `메일 기록을 읽지 못했습니다. SQL Editor에서 0006_mail.sql을 실행했는지 확인해 주세요. (${error.message})` }

  const site = siteUrl(null)
  const beforeAssign = d.config.team_assign_at && Date.now() < Date.parse(d.config.team_assign_at)
  const kinds = {}
  for (const kind of Object.keys(MAIL_KINDS)) {
    const last = new Map() // 사람마다 마지막 기록
    const lastSent = new Map() // 사람마다 마지막으로 보낸 기록
    for (const l of logs) {
      if (l.kind !== kind) continue
      last.set(l.user_id, l)
      if (l.status === 'sent' && !(lastSent.get(l.user_id)?.sent_at > l.sent_at)) lastSent.set(l.user_id, l)
    }
    const targets = buildTargets(kind, d)
    const pending = targets.filter((t) => lastSent.get(t.userId)?.ref !== t.ref)
    kinds[kind] = {
      total: targets.length,
      sent: targets.length - pending.length,
      pending: pending.length,
      sending: pending.filter((t) => last.get(t.userId)?.status === 'queued').length,
      failed: pending
        .filter((t) => last.get(t.userId)?.status === 'failed')
        .map((t) => ({ name: t.name, email: t.email, error: last.get(t.userId).error })),
      placeholders: placeholdersOf(kind),
      note: kind === 'team_assignment' && beforeAssign
        ? `팀 배정 발표(${formatKstDateTime(d.config.team_assign_at)}) 전입니다. 지금 보내도 내 팀 페이지에는 그 시각부터 팀이 보입니다.`
        : null,
      previews: samplesOf(kind, d).map((s) => {
        const { subject, text } = renderMail(s.template, s.vars, site)
        return { label: s.label, subject, text }
      }),
    }
  }
  return { ready, from, testing, kinds }
}
