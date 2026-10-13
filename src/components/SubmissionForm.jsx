'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { formatDateTime } from '../lib/labels.js'
import { TeamStage } from './TeamPanel.jsx'
import useTeamApi from './useTeamApi.js'

const EMPTY = {
  projectName: '', tagline: '', description: '', coverImagePath: null, coverImageUrl: null, prototypeUrl: '',
  slidesPath: null, slidesUrl: null, githubUrl: '', demoVideoUrl: '', deployUrl: '', pledge: false, submittedAt: null,
}

// 결과물 제출 (기획서 기능 5): 팀장이 작성·제출하고 마감 전까지 고친다. 팀원은 읽기만
export default function SubmissionForm({ initial }) {
  const api = useTeamApi(initial)
  const { state } = api

  if (state.stage !== 'team') return <TeamStage state={state} title="결과물 제출" />

  const s = state.submission ?? EMPTY
  const editable = state.isLeader && state.submitWindow === 'open'
  const { submitDeadlineAt, eventStartAt } = state.schedule
  const lede = {
    before: `행사가 시작되면 제출할 수 있습니다.${eventStartAt ? ` (${formatDateTime(eventStartAt)})` : ''}`,
    open: [submitDeadlineAt && `제출 마감 ${formatDateTime(submitDeadlineAt)}.`, state.isLeader && '마감 전까지 고칠 수 있습니다.'].filter(Boolean).join(' '),
    closed: '결과물 제출이 마감되었습니다.',
  }[state.submitWindow]

  return (
    <>
      <h1>결과물 제출</h1>
      <p className="lede">
        {lede}
        {!state.isLeader && ' 결과물은 팀장이 제출합니다.'}
      </p>
      {editable ? <Editor key={s.updatedAt ?? 'new'} s={s} api={api} /> : <Summary s={s} />}
      <div className="actions">
        <Link className="btn ghost" href="/team">내 팀</Link>
      </div>
    </>
  )
}

function Editor({ s, api }) {
  const { error, setError, busy, act, call } = api
  const [v, setV] = useState(s)
  const [uploading, setUploading] = useState(0)
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }))
  const submitted = Boolean(s.submittedAt)

  const save = (submit) => act('save_submission', { submission: v, submit })

  return (
    <form className="form glass page-card" onSubmit={(e) => { e.preventDefault(); save(true) }}>
      <div className="track-head">
        <h3>프로젝트</h3>
        <span className="track-size">{submitted ? `제출 완료 · ${formatDateTime(s.submittedAt)}` : '작성 중'}</span>
      </div>
      <label className="field">
        <span className="field-label">프로젝트명</span>
        <input type="text" value={v.projectName} onChange={set('projectName')} maxLength={60} />
      </label>
      <label className="field">
        <span className="field-label">한 줄 소개</span>
        <input type="text" value={v.tagline} onChange={set('tagline')} maxLength={100} placeholder="어떤 문제를 어떻게 푸는지 한 문장으로" />
      </label>
      <label className="field">
        <span className="field-label">상세 설명</span>
        <textarea rows={8} value={v.description} onChange={set('description')} maxLength={5000} />
      </label>
      <FileField
        label="대표 이미지 (선택 · PNG·JPG·WEBP, 5MB)"
        kind="cover" accept="image/png,image/jpeg,image/webp" max={5}
        path={v.coverImagePath} url={v.coverImagePath === s.coverImagePath ? s.coverImageUrl : null}
        onChange={(path) => setV((x) => ({ ...x, coverImagePath: path }))}
        call={call} setError={setError} setUploading={setUploading} preview
      />

      <h4 className="form-group">필수 제출물</h4>
      <label className="field">
        <span className="field-label">서비스 프로토타입 링크</span>
        <input type="text" inputMode="url" value={v.prototypeUrl} onChange={set('prototypeUrl')} placeholder="https:// — 배포 주소, Figma 프로토타입 등" />
      </label>
      <FileField
        label="발표자료 (PDF, 20MB)"
        kind="slides" accept="application/pdf" max={20}
        path={v.slidesPath} url={v.slidesPath === s.slidesPath ? s.slidesUrl : null}
        onChange={(path) => setV((x) => ({ ...x, slidesPath: path }))}
        call={call} setError={setError} setUploading={setUploading}
      />
      <label className="field">
        <span className="field-label">GitHub 저장소</span>
        <input type="text" inputMode="url" value={v.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/계정/저장소" />
      </label>

      <h4 className="form-group">선택</h4>
      <label className="field">
        <span className="field-label">시연 영상 링크</span>
        <input type="text" inputMode="url" value={v.demoVideoUrl} onChange={set('demoVideoUrl')} placeholder="https://" />
      </label>
      <label className="field">
        <span className="field-label">배포 링크</span>
        <input type="text" inputMode="url" value={v.deployUrl} onChange={set('deployUrl')} placeholder="https://" />
      </label>

      <label className="check">
        <input type="checkbox" checked={v.pledge} onChange={(e) => setV((x) => ({ ...x, pledge: e.target.checked }))} />
        <span>제출한 결과물은 우리 팀이 이번 해커톤 기간에 만든 것이며, 프로젝트명·소개·대표 이미지를 행사 홍보에 쓰는 데 동의합니다.</span>
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy || uploading > 0}>{submitted ? '수정 저장' : '제출하기'}</button>
        {!submitted && <button className="btn ghost" type="button" disabled={busy || uploading > 0} onClick={() => save(false)}>임시 저장</button>}
      </div>
    </form>
  )
}

// 파일 올리기: 기본 파일 선택 상자는 숨기고 유리 버튼으로 연다.
// 서버에서 받은 서명 주소로 Storage에 바로 올린다 (진행률 표시를 위해 XHR)
function FileField({ label, kind, accept, max, path, url, onChange, call, setError, setUploading, preview }) {
  const inputRef = useRef(null)
  const [progress, setProgress] = useState(null)
  const [localUrl, setLocalUrl] = useState(null)
  const [fileName, setFileName] = useState(null)

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!accept.split(',').includes(file.type)) return setError('올릴 수 없는 파일 형식입니다.')
    if (file.size > max * 1024 * 1024) return setError(`파일이 너무 큽니다. ${max}MB까지 올릴 수 있습니다.`)
    setError(null)
    setUploading((n) => n + 1)
    setProgress(0)
    try {
      const { path: newPath, uploadUrl } = await call('upload_url', { kind, type: file.type, size: file.size })
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100))
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('파일을 올리지 못했습니다. 다시 시도해 주세요.')))
        xhr.onerror = () => reject(new Error('파일을 올리지 못했습니다. 네트워크를 확인해 주세요.'))
        xhr.send(file)
      })
      setFileName(file.name)
      setLocalUrl(preview ? URL.createObjectURL(file) : null)
      onChange(newPath)
    } catch (err) {
      setError(err.message)
    } finally {
      setProgress(null)
      setUploading((n) => n - 1)
    }
  }

  const shownUrl = localUrl ?? url
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="file-field">
        {preview && shownUrl && path && <img className="file-preview" src={shownUrl} alt="" />}
        <span className={path ? 'file-name' : 'file-name placeholder'}>
          {progress !== null ? `올리는 중 ${progress}%` : path ? (fileName ?? (url ? <a className="text-link" href={url} target="_blank" rel="noreferrer">올린 파일 보기</a> : '올린 파일')) : '아직 올리지 않았습니다'}
        </span>
        <input ref={inputRef} type="file" accept={accept} hidden onChange={pick} />
        <button type="button" className="btn small ghost" disabled={progress !== null} onClick={() => inputRef.current?.click()}>
          {path ? '바꾸기' : '파일 선택'}
        </button>
        {path && progress === null && kind === 'cover' && (
          <button type="button" className="btn small ghost" onClick={() => { setLocalUrl(null); setFileName(null); onChange(null) }}>빼기</button>
        )}
      </div>
      {progress !== null && <span className="file-progress" style={{ '--p': `${progress}%` }} />}
    </div>
  )
}

// 읽기 전용 (팀원, 마감 뒤, 시작 전)
function Summary({ s }) {
  if (!s.projectName) return <p className="glass page-card muted">아직 저장된 결과물이 없습니다.</p>
  const link = (u) => (u ? <a className="text-link" href={u} target="_blank" rel="noreferrer">{u}</a> : <span className="pending">없음</span>)
  return (
    <section className="glass page-card">
      <div className="track-head">
        <h3>{s.projectName}</h3>
        <span className="track-size">{s.submittedAt ? `제출 완료 · ${formatDateTime(s.submittedAt)}` : '임시 저장'}</span>
      </div>
      {s.coverImageUrl && <img className="file-preview large" src={s.coverImageUrl} alt="" />}
      {s.tagline && <p className="team-project">{s.tagline}</p>}
      {s.description && <p className="muted pre">{s.description}</p>}
      <dl className="rows submission-rows">
        <div><dt>프로토타입</dt><dd>{link(s.prototypeUrl)}</dd></div>
        <div><dt>발표자료</dt><dd>{s.slidesUrl ? <a className="text-link" href={s.slidesUrl} target="_blank" rel="noreferrer">PDF 열기</a> : <span className="pending">없음</span>}</dd></div>
        <div><dt>GitHub</dt><dd>{link(s.githubUrl)}</dd></div>
        <div><dt>시연 영상</dt><dd>{link(s.demoVideoUrl)}</dd></div>
        <div><dt>배포 링크</dt><dd>{link(s.deployUrl)}</dd></div>
      </dl>
    </section>
  )
}
