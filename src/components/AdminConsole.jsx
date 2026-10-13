'use client'

import { useMemo, useState } from 'react'
import { APPLICATION_STATUS_LABEL, SCHOOL_SHORT, formatDateTime } from '../lib/labels.js'
import DateTimeField from './ui/DateTimeField.jsx'
import Select from './ui/Select.jsx'
import Stepper from './ui/Stepper.jsx'
import useConfirm from './ui/useConfirm.jsx'

const TABS = [
  { id: 'applications', label: '신청 관리' },
  { id: 'assign', label: '팀 배정' },
  { id: 'teams', label: '팀 관리' },
  { id: 'mail', label: '메일' },
  { id: 'schedule', label: '일정' },
  { id: 'accounts', label: '계정' },
]
const ROLE_LABEL = { participant: '참가자', judge: '심사위원', admin: '운영진' }

// 관리자 화면. 모든 변경은 POST /api/admin 후 돌려받은 최신 데이터로 다시 그린다.
// act는 성공하면 응답 JSON(메일 작업은 result 포함), 실패하면 false를 돌려준다
export default function AdminConsole({ initial, adminId }) {
  const [data, setData] = useState(initial)
  const [tab, setTab] = useState('applications')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function act(action, payload = {}) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? '처리하지 못했습니다.')
        return false
      }
      setData(json)
      return json
    } catch {
      setError('처리하지 못했습니다. 네트워크를 확인해 주세요.')
      return false
    } finally {
      setBusy(false)
    }
  }

  // 자주 쓰는 연결 관계
  const idx = useMemo(() => {
    const user = new Map(data.users.map((u) => [u.id, u]))
    const team = new Map(data.teams.map((t) => [t.id, t]))
    const membersOf = new Map(data.teams.map((t) => [t.id, []]))
    const teamOfUser = new Map()
    for (const m of data.members) {
      membersOf.get(m.team_id)?.push(m)
      teamOfUser.set(m.user_id, m.team_id)
    }
    const appOfUser = new Map(data.applications.map((a) => [a.user_id, a]))
    return { user, team, membersOf, teamOfUser, appOfUser }
  }, [data])

  const props = { data, idx, act, busy, adminId }
  return (
    <>
      <h1>관리자</h1>
      <nav className="admin-tabs" aria-label="관리 메뉴">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      {error && <p className="form-error" role="alert">{error}</p>}
      {tab === 'applications' && <Applications {...props} />}
      {tab === 'assign' && <Assign {...props} />}
      {tab === 'teams' && <Teams {...props} />}
      {tab === 'mail' && <Mail {...props} />}
      {tab === 'schedule' && <Schedule {...props} />}
      {tab === 'accounts' && <Accounts {...props} />}
    </>
  )
}

const school = (u) => SCHOOL_SHORT[u?.school] ?? '외부'

// ───────────────────────── 신청 관리 ─────────────────────────
function Applications({ data, idx, act, busy }) {
  const [kind, setKind] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(() => new Set())
  const [open, setOpen] = useState(null)

  // 개인 신청은 한 줄, 팀 신청은 팀마다 한 줄로 묶는다
  const rows = useMemo(() => {
    const out = []
    const seenTeams = new Set()
    for (const a of data.applications) {
      if (a.kind === 'solo') out.push({ key: a.id, kind: 'solo', status: a.status, apps: [a], submittedAt: a.submitted_at })
      else if (!seenTeams.has(a.team_id)) {
        seenTeams.add(a.team_id)
        const apps = data.applications.filter((x) => x.team_id === a.team_id)
        out.push({ key: a.team_id, kind: 'team', status: a.status, apps, team: idx.team.get(a.team_id), submittedAt: idx.team.get(a.team_id)?.application_submitted_at })
      }
    }
    return out
  }, [data, idx])

  const visible = rows.filter((r) => (kind === 'all' || r.kind === kind) && (status === 'all' || r.status === status))
  const count = (s) => rows.filter((r) => r.status === s).length
  const toggle = (key) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const decideSelected = async (s) => {
    const ids = rows.filter((r) => selected.has(r.key)).map((r) => r.apps[0].id)
    if (!ids.length) return
    if (await act('decide', { ids, status: s })) setSelected(new Set())
  }

  return (
    <section className="admin-section">
      <div className="admin-toolbar">
        <p className="note">
          제출 {count('submitted')} · 승인 {count('approved')} · 거절 {count('rejected')} · 작성 중 {count('draft')} (팀은 한 건으로 셉니다)
          {data.config.selection_announce_at && <><br />승인·거절은 선발 발표({formatDateTime(data.config.selection_announce_at)}) 전까지 참가자에게 &apos;결과 대기&apos;로 보입니다.</>}
        </p>
        <div className="actions">
          <a className="btn small ghost" href="/api/admin/export">명단 내보내기 (CSV)</a>
        </div>
      </div>

      <div className="admin-filters">
        <Select size="small" value={kind} onChange={setKind} ariaLabel="유형" options={[['all', '전체 유형'], ['solo', '개인'], ['team', '팀']]} />
        <Select size="small" value={status} onChange={setStatus} ariaLabel="상태" options={[['all', '전체 상태'], ['submitted', '제출'], ['approved', '승인'], ['rejected', '거절'], ['draft', '작성 중']]} />
        <span className="note">{selected.size}건 선택</span>
        <button className="btn small primary" disabled={busy || !selected.size} onClick={() => decideSelected('approved')}>승인</button>
        <button className="btn small ghost" disabled={busy || !selected.size} onClick={() => decideSelected('rejected')}>거절</button>
        <button className="btn small ghost" disabled={busy || !selected.size} onClick={() => decideSelected('submitted')}>결정 취소</button>
      </div>

      <div className="glass admin-list">
        {visible.length === 0 && <p className="note empty">해당하는 신청이 없습니다.</p>}
        {visible.map((r) => {
          const first = idx.user.get(r.apps[0].user_id)
          return (
            <div key={r.key} className="admin-row">
              <div className="admin-row-main">
                <input type="checkbox" checked={selected.has(r.key)} disabled={r.status === 'draft'} onChange={() => toggle(r.key)} aria-label="선택" />
                <button className="admin-row-title" onClick={() => setOpen(open === r.key ? null : r.key)}>
                  {r.kind === 'team' ? <>{r.team?.name || '팀명 미정'} <span className="note">팀 {r.apps.length}명</span></> : <>{first?.name} <span className="note">{school(first)}</span></>}
                </button>
                <span className="admin-row-sub">
                  {r.kind === 'team' ? r.apps.map((a) => school(idx.user.get(a.user_id))).join(' · ') : r.apps[0].desired_role}
                </span>
                <span className={`status s-${r.status}`}>{APPLICATION_STATUS_LABEL[r.status]}</span>
              </div>
              {open === r.key && (
                <div className="admin-detail">
                  {r.apps.map((a) => {
                    const u = idx.user.get(a.user_id)
                    return (
                      <dl key={a.id} className="rows">
                        <div><dt>{u?.name}{r.team?.leader_id === u?.id && ' · 대표'}</dt><dd>{school(u)} · {u?.student_id} · {u?.email} · {u?.phone}</dd></div>
                        <div><dt>역할 · 스택</dt><dd>{a.desired_role || '-'} · {(a.tech_stack ?? []).join(', ') || '-'}</dd></div>
                        {a.motivation && <div><dt>{r.kind === 'team' ? '한마디' : '지원 동기'}</dt><dd className="pre">{a.motivation}</dd></div>}
                      </dl>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ───────────────────────── 팀 배정 ─────────────────────────
function Assign({ data, idx, act, busy }) {
  const { team_min_size: min, team_max_size: max } = data.config
  // 승인된 개인 참가자 중 아직 팀이 없는 사람
  const pool = data.applications.filter((a) => a.kind === 'solo' && a.status === 'approved' && !idx.teamOfUser.has(a.user_id))
  const assigned = data.teams.filter((t) => t.origin === 'assigned')
  const [picked, setPicked] = useState([])
  const [name, setName] = useState('')
  const [leader, setLeader] = useState('')
  const [addTo, setAddTo] = useState({})
  const [dialog, confirm] = useConfirm()

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const sizeOk = picked.length >= min && picked.length <= max
  const create = async () => {
    if (!sizeOk && !(await confirm(`팀 인원 조건(${min}~${max}명)을 벗어납니다. 그래도 만들까요?`, { ok: '만들기' }))) return
    if (await act('create_team', { name, userIds: picked, leaderId: leader || null })) {
      setPicked([])
      setName('')
      setLeader('')
    }
  }

  return (
    <section className="admin-section admin-assign">
      {dialog}
      <div className="glass">
        <div className="track-head"><h3>배정 대기</h3><span className="track-size">{pool.length}명</span></div>
        {pool.length === 0 && <p className="note">승인된 개인 참가자 중 팀이 없는 사람이 없습니다.</p>}
        <ul className="pick-list">
          {pool.map((a) => {
            const u = idx.user.get(a.user_id)
            return (
              <li key={a.user_id}>
                <label className="check">
                  <input type="checkbox" checked={picked.includes(a.user_id)} onChange={() => toggle(a.user_id)} />
                  <span><strong>{u?.name}</strong> <span className="note">{school(u)}</span><br /><span className="muted">{a.desired_role} · {(a.tech_stack ?? []).join(', ')}</span></span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="form assign-form">
          <p className={`size-check ${sizeOk ? 'ok' : ''}`}>
            {picked.length}명 선택 · {[...new Set(picked.map((id) => school(idx.user.get(id))))].join(' · ') || '학교 없음'} · 조건 {min}~{max}명
          </p>
          <label className="field"><span className="field-label">팀명 (비워 두면 팀이 정함)</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
          <label className="field">
            <span className="field-label">팀장</span>
            <Select value={leader} onChange={setLeader} ariaLabel="팀장" options={[['', '나중에 지정'], ...picked.map((id) => [id, idx.user.get(id)?.name])]} />
          </label>
          <button className="btn primary" disabled={busy || !picked.length} onClick={create}>팀 만들기</button>
        </div>
      </div>

      <div className="assigned-teams">
        {assigned.length === 0 && <p className="note">아직 배정한 팀이 없습니다.</p>}
        {assigned.map((t) => {
          const ms = idx.membersOf.get(t.id) ?? []
          return (
            <div key={t.id} className="glass">
              <div className="track-head"><h3>{t.name || '팀명 미정'}</h3><span className={`track-size ${ms.length < min || ms.length > max ? 'warn' : ''}`}>{ms.length}명</span></div>
              <ul className="member-list">
                {ms.map((m) => {
                  const u = idx.user.get(m.user_id)
                  return (
                    <li key={m.user_id}>
                      <span>{u?.name} <span className="note">{school(u)} · {m.role || '-'}{t.leader_id === m.user_id && ' · 팀장'}</span></span>
                      <button className="btn small ghost" disabled={busy} onClick={() => act('remove_member', { teamId: t.id, userId: m.user_id })}>빼기</button>
                    </li>
                  )
                })}
              </ul>
              {pool.length > 0 && (
                <div className="inline-form">
                  <Select
                    size="small"
                    value={addTo[t.id] ?? ''}
                    onChange={(v) => setAddTo((s) => ({ ...s, [t.id]: v }))}
                    ariaLabel="추가할 참가자"
                    options={[['', '배정 대기에서 추가…'], ...pool.map((a) => [a.user_id, `${idx.user.get(a.user_id)?.name} (${school(idx.user.get(a.user_id))})`])]}
                  />
                  <button className="btn small ghost" disabled={busy || !addTo[t.id]} onClick={() => act('add_member', { teamId: t.id, userId: addTo[t.id] })}>추가</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ───────────────────────── 팀 관리 ─────────────────────────
function Teams({ data, idx, act, busy }) {
  const initialOrder = useMemo(
    () => [...data.teams].sort((a, b) => (a.presentation_order ?? 1e9) - (b.presentation_order ?? 1e9) || a.created_at.localeCompare(b.created_at)).map((t) => t.id),
    [data.teams],
  )
  const [order, setOrder] = useState(initialOrder)
  const ids = order.filter((id) => idx.team.has(id)).concat(initialOrder.filter((id) => !order.includes(id)))
  const move = (i, d) => setOrder(() => {
    const next = [...ids]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    return next
  })
  const changed = ids.join() !== initialOrder.join() || data.teams.some((t) => t.presentation_order == null)

  return (
    <section className="admin-section">
      <div className="admin-toolbar">
        <p className="note">팀 {ids.length}개 · 위에서부터 발표 순서</p>
        <button className="btn small primary" disabled={busy || !ids.length || !changed} onClick={() => act('set_order', { teamIds: ids })}>발표 순서 저장</button>
      </div>
      <div className="glass admin-list">
        {ids.length === 0 && <p className="note empty">팀이 없습니다.</p>}
        {ids.map((id, i) => {
          const t = idx.team.get(id)
          const ms = idx.membersOf.get(id) ?? []
          const status = idx.appOfUser.get(ms[0]?.user_id)?.status
          return (
            <div key={id} className="admin-row">
              <div className="admin-row-main">
                <span className="order mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="admin-row-title static">{t.name || '팀명 미정'} <span className="note">{t.origin === 'applied' ? '팀 신청' : '운영진 배정'}{status && ` · ${APPLICATION_STATUS_LABEL[status]}`}</span></span>
                <span className="admin-row-sub">{ms.map((m) => idx.user.get(m.user_id)?.name).join(', ')}</span>
                <Select
                  size="small"
                  value={t.leader_id ?? ''}
                  disabled={busy}
                  onChange={(v) => v && act('set_leader', { teamId: id, userId: v })}
                  ariaLabel="팀장"
                  options={[['', '팀장 미정'], ...ms.map((m) => [m.user_id, idx.user.get(m.user_id)?.name])]}
                />
                <span className="order-buttons">
                  <button className="btn small ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">↑</button>
                  <button className="btn small ghost" disabled={i === ids.length - 1} onClick={() => move(i, 1)} aria-label="아래로">↓</button>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ───────────────────────── 메일 ─────────────────────────
const MAIL_CARDS = [
  {
    kind: 'selection_result',
    title: '선발 결과',
    desc: '승인·거절이 정해진 신청자 모두에게 결과를 알립니다. 보낸 뒤 결정이 바뀌면 다시 보낼 대상에 들어갑니다.',
  },
  {
    kind: 'team_assignment',
    title: '팀 배정',
    desc: '운영진이 배정한 팀의 팀원에게 팀과 팀원 연락처를 알립니다. 팀으로 신청한 팀에는 보내지 않고, 다른 팀으로 옮긴 사람은 다시 보낼 대상에 들어갑니다.',
  },
]

function Mail({ data, act, busy }) {
  const { mail } = data
  const [dialog, confirm] = useConfirm()
  const [result, setResult] = useState(null)

  const run = async (card, action) => {
    const info = mail.kinds[card.kind]
    if (action === 'send_mail' && !(await confirm(`${info.pending}명에게 ${card.title} 메일을 보낼까요? 보낸 메일은 되돌릴 수 없습니다.`, { ok: '보내기' }))) return
    setResult(null)
    const res = await act(action, { kind: card.kind })
    if (res?.result) setResult({ kind: card.kind, ...res.result })
  }

  if (mail.error) return <section className="admin-section"><p className="form-error">{mail.error}</p></section>
  return (
    <section className="admin-section">
      {dialog}
      <p className="note">
        {!mail.ready
          ? '메일 발송 설정이 없습니다. Vercel 환경변수(로컬은 .env.local)에 RESEND_API_KEY와 MAIL_FROM을 넣어 주세요.'
          : `발신 ${mail.from}${mail.testing ? ' — 도메인 인증 전 테스트 주소라 Resend 계정 주인의 메일로만 보낼 수 있습니다.' : ''}`}
      </p>
      {MAIL_CARDS.map((card) => {
        const info = mail.kinds[card.kind]
        const blocked = info.placeholders.length > 0
        const r = result?.kind === card.kind ? result : null
        return (
          <div key={card.kind} className="glass mail-card">
            <div className="track-head">
              <h3>{card.title}</h3>
              <span className="track-size">대상 {info.total}명 · 보냄 {info.sent} · 남음 {info.pending}{info.sending > 0 && ` (보내는 중 ${info.sending})`}</span>
            </div>
            <p className="muted">{card.desc}</p>
            {info.note && <p className="note">{info.note}</p>}
            {blocked && <p className="form-error">채우지 않은 자리표시가 있어 보낼 수 없습니다: {info.placeholders.join(' ')} (src/content.js)</p>}
            <div className="actions">
              <button className="btn primary" disabled={busy || !mail.ready || blocked || !info.pending} onClick={() => run(card, 'send_mail')}>
                남은 {info.pending}명에게 보내기
              </button>
              <button className="btn ghost" disabled={busy || !mail.ready} onClick={() => run(card, 'test_mail')}>나에게 테스트 발송</button>
            </div>
            {r && (
              <p className="notice" role="status">
                {r.test
                  ? `${r.to}로 테스트 메일 ${r.sent}통을 보냈습니다.`
                  : r.sent + r.failed === 0
                    ? '새로 보낼 대상이 없었습니다.'
                    : `${r.sent}명에게 보냈습니다.${r.failed ? ` ${r.failed}명은 보내지 못했습니다.` : ''}`}
              </p>
            )}
            {info.failed.length > 0 && (
              <>
                <p className="field-error mail-failed">보내지 못한 {info.failed.length}명 — 다시 보내기를 누르면 함께 보냅니다.</p>
                <ul className="member-list">
                  {info.failed.map((f) => (
                    <li key={f.email}><span>{f.name} <span className="note">{f.email}</span></span><span className="note">{f.error}</span></li>
                  ))}
                </ul>
              </>
            )}
            <details className="mail-preview">
              <summary>미리보기</summary>
              {info.previews.map((p) => (
                <div key={p.label}>
                  <p className="note">{p.label}</p>
                  <pre className="pre">{`제목: ${p.subject}\n\n${p.text}`}</pre>
                </div>
              ))}
            </details>
          </div>
        )
      })}
    </section>
  )
}

// ───────────────────────── 일정 ─────────────────────────
const SCHEDULE_FIELDS = [
  ['apply_open_at', '신청 시작'], ['apply_close_at', '신청 마감'], ['selection_announce_at', '선발 발표'], ['team_assign_at', '팀 배정 발표'],
  ['event_start_at', '행사 시작'], ['event_end_at', '행사 종료'], ['submit_deadline_at', '결과물 제출 마감'],
  ['judging_start_at', '심사 시작'], ['judging_end_at', '심사 종료'], ['results_announce_at', '결과 발표'],
]
// ISO ↔ 날짜·시간 선택값 'YYYY-MM-DDTHH:mm' (브라우저 현지 시각)
const toLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function Schedule({ data, act, busy }) {
  const [v, setV] = useState(() => ({
    ...Object.fromEntries(SCHEDULE_FIELDS.map(([k]) => [k, toLocal(data.config[k])])),
    team_min_size: data.config.team_min_size,
    team_max_size: data.config.team_max_size,
  }))
  const save = () => act('save_config', {
    config: {
      ...Object.fromEntries(SCHEDULE_FIELDS.map(([k]) => [k, v[k] ? new Date(v[k]).toISOString() : null])),
      team_min_size: Number(v.team_min_size),
      team_max_size: Number(v.team_max_size),
    },
  })
  return (
    <section className="admin-section">
      <form className="form glass admin-schedule" onSubmit={(e) => { e.preventDefault(); save() }}>
        <p className="note">여기 일정과 팀 인원은 첫 화면(일시·신청 버튼·행사 일정·참가 자격)에 그대로 보이고, 비운 칸은 '미정'으로 보입니다. 신청 시작·마감을 비워 두면 그쪽 제한 없이 신청을 받습니다.</p>
        <div className="schedule-grid">
          {SCHEDULE_FIELDS.map(([k, label]) => (
            <label key={k} className="field">
              <span className="field-label">{label}</span>
              <DateTimeField value={v[k]} onChange={(val) => setV((s) => ({ ...s, [k]: val }))} ariaLabel={label} />
            </label>
          ))}
          <div className="field"><span className="field-label">팀 최소 인원</span><Stepper value={v.team_min_size} min={1} max={Number(v.team_max_size)} onChange={(n) => setV((s) => ({ ...s, team_min_size: n }))} ariaLabel="팀 최소 인원" /></div>
          <div className="field"><span className="field-label">팀 최대 인원</span><Stepper value={v.team_max_size} min={Number(v.team_min_size)} max={10} onChange={(n) => setV((s) => ({ ...s, team_max_size: n }))} ariaLabel="팀 최대 인원" /></div>
        </div>
        <div className="actions"><button className="btn primary" type="submit" disabled={busy}>저장</button></div>
      </form>
    </section>
  )
}

// ───────────────────────── 계정 ─────────────────────────
function Accounts({ data, act, busy, adminId }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('judge')
  const [note, setNote] = useState('')
  const [q, setQ] = useState('')
  const users = data.users.filter((u) => !q || `${u.name ?? ''} ${u.email}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <section className="admin-section">
      <div className="glass">
        <div className="track-head"><h3>초청 계정</h3><span className="track-size">학교 계정이 아닌 심사위원·운영진</span></div>
        <form className="invite-form" onSubmit={async (e) => { e.preventDefault(); if (await act('add_invite', { email, role, note })) { setEmail(''); setNote('') } }}>
          <input type="email" placeholder="Google 계정 이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Select value={role} onChange={setRole} ariaLabel="초청 역할" options={[['judge', '심사위원'], ['admin', '운영진']]} />
          <input type="text" placeholder="메모 (예: ○○회사)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} />
          <button className="btn small primary" type="submit" disabled={busy}>초청</button>
        </form>
        <ul className="member-list">
          {data.invites.length === 0 && <li className="note">초청한 계정이 없습니다.</li>}
          {data.invites.map((i) => (
            <li key={i.email}>
              <span>{i.email} <span className="note">{ROLE_LABEL[i.role]}{i.note && ` · ${i.note}`}</span></span>
              <button className="btn small ghost" disabled={busy} onClick={() => act('remove_invite', { email: i.email })}>삭제</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass">
        <div className="track-head">
          <h3>가입한 계정</h3>
          <input className="search" type="text" placeholder="이름·이메일 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="계정 검색" />
        </div>
        <ul className="member-list">
          {users.map((u) => (
            <li key={u.id}>
              <span>{u.name || '(프로필 미입력)'} <span className="note">{school(u)} · {u.email}</span></span>
              <Select
                size="small"
                value={u.role}
                disabled={busy || u.id === adminId}
                onChange={(v) => act('set_role', { userId: u.id, role: v })}
                ariaLabel="역할"
                options={Object.entries(ROLE_LABEL)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

