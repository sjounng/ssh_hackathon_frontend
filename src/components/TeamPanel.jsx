'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SCHOOL_SHORT, formatDateTime } from '../lib/labels.js'
import useTeamApi from './useTeamApi.js'

// 내 팀 (기획서 기능 4): 팀명·팀원 확인, 팀명 정하기, 내 역할 수정, 결과물 제출 현황
export default function TeamPanel({ initial }) {
  const { state, error, busy, act } = useTeamApi(initial)

  if (state.stage !== 'team') return <TeamStage state={state} />

  const { team, myId, submission } = state
  return (
    <>
      <h1>{team.name || '팀명 미정'}</h1>
      <p className="lede">
        {team.origin === 'assigned' ? '운영진이 배정한 팀입니다.' : '함께 신청한 팀입니다.'}
        {team.presentationOrder ? ` 발표 순서 ${team.presentationOrder}번.` : ''}
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="glass page-card">
        <div className="track-head">
          <h3>팀원</h3>
          <span className="track-size">{team.members.length}명</span>
        </div>
        <dl className="rows member-rows team-members">
          {team.members.map((m) => (
            <div key={m.userId}>
              <dt>
                {m.name}
                {m.userId === team.leaderId && <span className="note"> · 팀장</span>}
                {m.userId === myId && <span className="note"> · 나</span>}
              </dt>
              <dd>
                <span>{SCHOOL_SHORT[m.school] ?? ''} · {m.role || <span className="pending">역할 미정</span>}</span>
                <a className="note" href={`mailto:${m.email}`}>{m.email}</a>
              </dd>
            </div>
          ))}
        </dl>
        {!team.leaderId && <p className="muted team-note">아직 팀장이 정해지지 않았습니다. 결과물은 팀장이 제출하므로 운영진에게 팀장을 알려 주세요.</p>}
      </section>

      {state.canEditTeam && (
        <section className="glass page-card team-edit">
          {state.canRename && <RenameForm team={team} act={act} busy={busy} />}
          <RoleForm role={team.members.find((m) => m.userId === myId)?.role ?? ''} act={act} busy={busy} />
        </section>
      )}

      <section className="glass page-card">
        <div className="track-head">
          <h3>결과물</h3>
          <span className="track-size">{submission?.submittedAt ? '제출 완료' : submission ? '임시 저장' : '아직 없음'}</span>
        </div>
        {submission && <p className="team-project">{submission.projectName}{submission.tagline && <span className="muted"> — {submission.tagline}</span>}</p>}
        <p className="muted">
          {state.schedule.submitDeadlineAt ? `제출 마감 ${formatDateTime(state.schedule.submitDeadlineAt)}. ` : ''}
          {state.isLeader ? '팀장이 제출하고 마감 전까지 고칠 수 있습니다.' : '팀장이 제출하며, 팀원은 내용을 볼 수 있습니다.'}
        </p>
        <div className="actions">
          <Link className="btn primary" href="/submit">{state.isLeader && state.submitWindow === 'open' ? (submission ? '결과물 수정' : '결과물 제출') : '결과물 보기'}</Link>
        </div>
      </section>
    </>
  )
}

function RenameForm({ team, act, busy }) {
  const [name, setName] = useState(team.name ?? '')
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act('rename', { name }) }}>
      <label className="field">
        <span className="field-label">팀명</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="팀명을 정해 주세요" maxLength={40} />
      </label>
      <button className="btn ghost" type="submit" disabled={busy || !name.trim() || name.trim() === team.name}>저장</button>
    </form>
  )
}

function RoleForm({ role: initial, act, busy }) {
  const [role, setRole] = useState(initial)
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act('set_role', { role }) }}>
      <label className="field">
        <span className="field-label">팀에서 맡은 역할</span>
        <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="예: 프론트엔드, 디자인, 기획" maxLength={40} />
      </label>
      <button className="btn ghost" type="submit" disabled={busy || !role.trim() || role.trim() === initial}>저장</button>
    </form>
  )
}

// 팀이 아직 없는 단계별 안내
export function TeamStage({ state, title = '내 팀' }) {
  const assignAt = formatDateTime(state.schedule?.teamAssignAt)
  const message = {
    none: ['아직 참가 신청을 하지 않았습니다.', { href: '/apply', label: '참가 신청하기' }],
    pending: ['선발 결과가 나오면 팀이 표시됩니다.', { href: '/apply', label: '신청 내용 보기' }],
    rejected: ['아쉽게도 이번 해커톤에 선발되지 않았습니다.', null],
    waiting: [`선발되었습니다. 운영진이 팀을 배정하고 있습니다.${assignAt ? ` 팀 배정 발표는 ${assignAt}입니다.` : ''}`, null],
  }[state.stage]
  return (
    <>
      <h1>{title}</h1>
      <p className="lede">{message[0]}</p>
      <div className="actions">
        {message[1] && <Link className="btn primary" href={message[1].href}>{message[1].label}</Link>}
        <Link className="btn ghost" href="/me">내 정보</Link>
      </div>
    </>
  )
}
