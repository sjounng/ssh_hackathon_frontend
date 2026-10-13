'use client'

import { useState } from 'react'
import { APPLICATION_STATUS_LABEL, SCHOOL_SHORT } from '../lib/labels.js'
import useConfirm from './ui/useConfirm.jsx'

const fmt = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 참가 신청 화면: 유형 선택 → 개인 신청서 / 팀 화면. 모든 변경은 POST /api/apply 후 새 상태로 다시 그린다
export default function ApplyFlow({ initial, myId }) {
  const [state, setState] = useState(initial)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function act(action, payload = {}) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
        if (data.state) setState(data.state)
        return false
      }
      setState(data)
      return true
    } catch {
      setError('처리하지 못했습니다. 네트워크를 확인해 주세요.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const { window: win, application: app, team } = state
  const decided = app && (app.status === 'approved' || app.status === 'rejected')
  const locked = !win.isOpen || decided

  return (
    <>
      <h1>참가 신청</h1>
      <p className="lede">
        {win.openAt || win.closeAt ? <>신청 기간 {fmt(win.openAt) ?? '…'} – {fmt(win.closeAt) ?? '…'}. </> : null}
        {win.isOpen ? '신청 마감 전까지 언제든 수정할 수 있습니다.' : '지금은 신청 기간이 아닙니다.'}
      </p>
      {decided && (
        <p className="notice">
          선발 결과: <strong>{APPLICATION_STATUS_LABEL[app.status]}</strong>
        </p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}

      {!app && <ChooseType act={act} busy={busy} locked={locked} />}
      {app?.kind === 'solo' && <SoloForm app={app} act={act} busy={busy} locked={locked} />}
      {app?.kind === 'team' && team && (
        <TeamView team={team} app={app} teamSize={state.teamSize} myId={myId} act={act} busy={busy} locked={locked} />
      )}
    </>
  )
}

// ── 유형 선택 ──
function ChooseType({ act, busy, locked }) {
  const [teamName, setTeamName] = useState('')
  const [code, setCode] = useState('')
  const [soloStarted, setSoloStarted] = useState(false)

  if (soloStarted) {
    return <SoloForm app={{ status: 'draft', desiredRole: '', techStack: [], motivation: '' }} act={act} busy={busy} locked={locked} onBack={() => setSoloStarted(false)} />
  }

  return (
    <div className="tracks apply-choose">
      <article className="glass track">
        <div className="track-head"><h3>개인 참가</h3><span className="track-size">1명</span></div>
        <p className="muted">혼자 신청하고, 선발되면 운영진이 팀을 배정합니다.</p>
        <div className="actions push">
          <button className="btn primary" disabled={locked} onClick={() => setSoloStarted(true)}>개인으로 신청</button>
        </div>
      </article>

      <article className="glass track">
        <div className="track-head"><h3>팀 참가</h3><span className="track-size">2~4명</span></div>
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act('create_team', { name: teamName }) }}>
          <label className="field">
            <span className="field-label">팀을 만들고 대표로 신청</span>
            <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="팀명" maxLength={40} disabled={locked} />
          </label>
          <button className="btn primary" type="submit" disabled={locked || busy || !teamName.trim()}>팀 만들기</button>
        </form>
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act('join_team', { code }) }}>
          <label className="field">
            <span className="field-label">대표에게 받은 참가 코드로 합류</span>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="참가 코드 6자리" maxLength={6} disabled={locked} />
          </label>
          <button className="btn ghost" type="submit" disabled={locked || busy || code.trim().length < 6}>합류하기</button>
        </form>
      </article>
    </div>
  )
}

// ── 개인 신청서 ──
function SoloForm({ app, act, busy, locked, onBack }) {
  const [dialog, confirm] = useConfirm()
  const [v, setV] = useState({ desiredRole: app.desiredRole, techStack: app.techStack.join(', '), motivation: app.motivation })
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))
  const submitted = app.status !== 'draft'
  const save = (submit) => act('save_solo', { ...v, submit })

  return (
    <form className="form glass page-card" onSubmit={(e) => { e.preventDefault(); save(true) }}>
      {dialog}
      <div className="track-head">
        <h3>개인 참가 신청서</h3>
        <span className="track-size">{APPLICATION_STATUS_LABEL[app.status]}</span>
      </div>
      <MyFields v={v} set={set} locked={locked} roleKey="desiredRole" roleLabel="희망 역할" motivationLabel="지원 동기" />
      <div className="actions">
        <button className="btn primary" type="submit" disabled={locked || busy}>{submitted ? '수정 저장' : '제출하기'}</button>
        {!submitted && <button className="btn ghost" type="button" disabled={locked || busy} onClick={() => save(false)}>임시 저장</button>}
        {onBack && <button className="btn ghost" type="button" onClick={onBack}>다른 방식 고르기</button>}
        {!onBack && !locked && (
          <button className="btn ghost" type="button" disabled={busy} onClick={async () => (await confirm('개인 신청을 취소할까요? 작성한 내용이 지워집니다.', { ok: '신청 취소', danger: true })) && act('cancel_solo')}>
            신청 취소
          </button>
        )}
      </div>
    </form>
  )
}

// ── 팀 화면 ──
function TeamView({ team, app, teamSize, myId, act, busy, locked }) {
  const isLeader = team.leaderId === myId
  const submitted = Boolean(team.submittedAt)
  const count = team.members.length
  const sizeOk = count >= teamSize.min && count <= teamSize.max
  const allRoles = team.members.every((m) => m.role)
  const [name, setName] = useState(team.name ?? '')
  const [v, setV] = useState({ role: app.desiredRole, techStack: app.techStack.join(', '), motivation: app.motivation })
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))
  const [copied, setCopied] = useState(false)
  const [dialog, confirm] = useConfirm()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(team.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="apply-team">
      {dialog}
      <section className="glass page-card">
        <div className="track-head">
          <h3>{team.name || '팀명 미정'}</h3>
          <span className="track-size">{submitted ? '팀 신청 제출 완료' : '작성 중'}</span>
        </div>

        {isLeader && !submitted && !locked && (
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act('rename_team', { name }) }}>
            <label className="field">
              <span className="field-label">팀명</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </label>
            <button className="btn ghost" type="submit" disabled={busy || !name.trim() || name.trim() === team.name}>변경</button>
          </form>
        )}

        {team.joinCode && !submitted && (
          <div className="join-code">
            <span className="field-label">참가 코드 · 팀원에게 공유하세요</span>
            <div className="join-code-row">
              <code className="mono">{team.joinCode}</code>
              <button className="btn small ghost" type="button" onClick={copy}>{copied ? '복사됨' : '복사'}</button>
            </div>
          </div>
        )}

        <dl className="rows member-rows">
          {team.members.map((m) => (
            <div key={m.userId}>
              <dt>
                {m.name}
                {m.userId === team.leaderId && <span className="note"> · 대표</span>}
              </dt>
              <dd>
                {SCHOOL_SHORT[m.school] ?? ''} · {m.role || <span className="pending">역할 미작성</span>}
              </dd>
            </div>
          ))}
        </dl>
        <p className={`size-check ${sizeOk ? 'ok' : ''}`}>
          {count}명 · {teamSize.min}~{teamSize.max}명 {sizeOk ? '충족' : '필요'}
          {!allRoles && ' · 역할을 작성하지 않은 팀원이 있습니다'}
        </p>

        <div className="actions">
          {isLeader && !submitted && (
            <button className="btn primary" disabled={locked || busy || !sizeOk || !allRoles} onClick={() => act('submit_team')}>팀 신청 제출</button>
          )}
          {isLeader && submitted && !locked && (
            <button className="btn ghost" disabled={busy} onClick={() => act('withdraw_team')}>제출 취소</button>
          )}
          {!submitted && !locked && (!isLeader || count === 1) && (
            <button
              className="btn ghost"
              disabled={busy}
              onClick={async () => (await confirm(isLeader ? '팀을 해체할까요?' : '팀에서 나갈까요?', { ok: isLeader ? '팀 해체' : '나가기', danger: true })) && act('leave_team')}
            >
              {isLeader ? '팀 해체' : '팀 나가기'}
            </button>
          )}
        </div>
      </section>

      <form className="form glass page-card" onSubmit={(e) => { e.preventDefault(); act('save_member', v) }}>
        <div className="track-head"><h3>내 정보</h3></div>
        <MyFields v={v} set={set} locked={locked} roleKey="role" roleLabel="팀에서 맡을 역할" motivationLabel="한마디 (선택)" />
        <div className="actions">
          <button className="btn primary" type="submit" disabled={locked || busy}>저장</button>
        </div>
      </form>
    </div>
  )
}

function MyFields({ v, set, locked, roleKey, roleLabel, motivationLabel }) {
  return (
    <>
      <label className="field">
        <span className="field-label">{roleLabel}</span>
        <input type="text" value={v[roleKey]} onChange={set(roleKey)} placeholder="예: 프론트엔드, 디자인, 기획" maxLength={40} disabled={locked} />
      </label>
      <label className="field">
        <span className="field-label">기술 스택 (쉼표로 구분)</span>
        <input type="text" value={v.techStack} onChange={set('techStack')} placeholder="예: React, Figma, Spring" disabled={locked} />
      </label>
      <label className="field">
        <span className="field-label">{motivationLabel}</span>
        <textarea rows={5} value={v.motivation} onChange={set('motivation')} maxLength={1000} disabled={locked} />
      </label>
    </>
  )
}
