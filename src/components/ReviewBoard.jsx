'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatDateTime } from '../lib/labels.js'

const pad = (n) => String(n).padStart(2, '0')

// 심사 화면 (기획서 기능 7): 목록에서 팀을 고르면 평가 항목별 점수를 매긴다.
// 발표 순서대로 '저장하고 다음 팀'으로 넘어간다. 저장은 POST /api/review 후 돌려받은 최신 상태로 다시 그린다
export default function ReviewBoard({ initial }) {
  const [state, setState] = useState(initial)
  const [openId, setOpenId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const { criteria = [], teams = [], window: win, schedule } = state

  const isDone = (t) => criteria.length > 0 && criteria.every((c) => t.scores[c.id] !== undefined)
  const doneCount = teams.filter(isDone).length

  async function save(teamId, scores, nextId) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', teamId, scores }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.state) setState(data.state)
        setError(data.error ?? '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      setState(data)
      setOpenId(nextId)
      window.scrollTo(0, 0)
    } catch {
      setError('저장하지 못했습니다. 네트워크를 확인해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const index = teams.findIndex((t) => t.teamId === openId)
  if (index >= 0) {
    return (
      <ScoreForm
        key={openId}
        team={teams[index]}
        criteria={criteria}
        nextId={teams[index + 1]?.teamId ?? null}
        editable={win === 'open'}
        busy={busy}
        error={error}
        onSave={save}
        onBack={() => { setError(null); setOpenId(null) }}
      />
    )
  }

  const lede = {
    before: `심사는 ${formatDateTime(schedule.startAt)}에 시작합니다. 그때부터 최종 제출된 프로젝트가 보입니다.`,
    open: `${teams.length}팀 중 ${doneCount}팀 채점.${schedule.endAt ? ` 심사 마감 ${formatDateTime(schedule.endAt)}.` : ''} 발표 순서대로 정렬되어 있습니다.`,
    closed: '심사가 끝났습니다. 내가 매긴 점수만 볼 수 있습니다.',
  }[win]

  return (
    <>
      <h1>심사</h1>
      <p className="lede">{lede}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!criteria.length && <p className="glass page-card muted">운영진이 평가 항목을 아직 정하지 않았습니다.</p>}
      {win !== 'before' && criteria.length > 0 && (teams.length ? (
        <div className="glass admin-list review-list">
          {teams.map((t) => {
            const n = criteria.filter((c) => t.scores[c.id] !== undefined).length
            return (
              <button key={t.teamId} type="button" className="admin-row review-row" onClick={() => setOpenId(t.teamId)}>
                <span className="order mono">{t.order ? pad(t.order) : '–'}</span>
                <span className="review-row-title">
                  <strong>{t.projectName}</strong>
                  <span className="note">{t.teamName || '팀명 미정'}</span>
                </span>
                <span className={`status ${isDone(t) ? 's-approved' : ''}`}>{isDone(t) ? '채점 완료' : n ? `${n}/${criteria.length}` : '미채점'}</span>
              </button>
            )
          })}
        </div>
      ) : <p className="glass page-card muted">아직 최종 제출된 프로젝트가 없습니다.</p>)}
    </>
  )
}

function ScoreForm({ team, criteria, nextId, editable, busy, error, onSave, onBack }) {
  const [v, setV] = useState(() => Object.fromEntries(criteria.map((c) => [c.id, team.scores[c.id] ?? null])))
  const inRange = (c) => v[c.id] !== null && Number.isFinite(v[c.id]) && v[c.id] >= Number(c.min_score) && v[c.id] <= Number(c.max_score)
  const complete = criteria.every(inRange)
  const payload = () => criteria.map((c) => ({ criterionId: c.id, score: v[c.id] }))

  return (
    <>
      <p className="back-link"><button type="button" className="text-link" onClick={onBack}>← 심사 목록</button></p>
      {team.order && <p className="project-badges"><span className="mono">발표 {pad(team.order)}</span></p>}
      <h1>{team.projectName}</h1>
      <p className="project-team">{team.teamName || '팀명 미정'}</p>
      {team.tagline && <p className="lede">{team.tagline}</p>}
      <div className="actions review-links">
        {team.slidesUrl && <a className="btn small ghost" href={team.slidesUrl} target="_blank" rel="noreferrer">발표자료</a>}
        {team.prototypeUrl && <a className="btn small ghost" href={team.prototypeUrl} target="_blank" rel="noreferrer">프로토타입</a>}
        {team.githubUrl && <a className="btn small ghost" href={team.githubUrl} target="_blank" rel="noreferrer">GitHub</a>}
        <Link className="btn small ghost" href={`/projects/${team.teamId}`} target="_blank">상세 보기</Link>
      </div>

      <form className="form glass page-card review-form" onSubmit={(e) => { e.preventDefault(); onSave(team.teamId, payload(), nextId) }}>
        {criteria.map((c) => (
          <div key={c.id} className="field">
            <span className="field-label">{c.name} <span className="note">{Number(c.min_score)}~{Number(c.max_score)}점</span></span>
            {c.description && <p className="note">{c.description}</p>}
            <ScoreInput c={c} value={v[c.id]} disabled={!editable} onChange={(x) => setV((s) => ({ ...s, [c.id]: x }))} />
          </div>
        ))}
        {error && <p className="form-error" role="alert">{error}</p>}
        {editable ? (
          <div className="actions">
            <button className="btn primary" type="submit" disabled={busy || !complete}>{nextId ? '저장하고 다음 팀' : '저장하고 목록으로'}</button>
            {nextId && <button className="btn ghost" type="button" disabled={busy || !complete} onClick={() => onSave(team.teamId, payload(), team.teamId)}>저장</button>}
          </div>
        ) : <p className="note">지금은 심사 기간이 아니라 점수를 고칠 수 없습니다.</p>}
      </form>
    </>
  )
}

// 범위가 10칸 이하인 정수 척도는 숫자 버튼, 그보다 넓으면 숫자 입력
function ScoreInput({ c, value, disabled, onChange }) {
  const min = Number(c.min_score)
  const max = Number(c.max_score)
  if (Number.isInteger(min) && Number.isInteger(max) && max - min <= 10) {
    return (
      <div className="score-scale" role="radiogroup" aria-label={c.name}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} className={value === n ? 'active' : ''} disabled={disabled} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
    )
  }
  return (
    <input
      type="number" inputMode="decimal" min={min} max={max} step={Number.isInteger(min) && Number.isInteger(max) ? 1 : 'any'}
      value={value ?? ''} disabled={disabled} aria-label={c.name}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}
