'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// 프로필 입력·수정 폼. 저장은 PATCH /api/me, 검증 오류는 항목별로 보여준다
export default function ProfileForm({ first, email, schoolLabel, needsStudentId, initial }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 422) {
        setErrors(data.errors ?? {})
        return
      }
      if (!res.ok) {
        setMessage(data.error ?? '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      router.push('/me')
      router.refresh()
    } catch {
      setMessage('저장하지 못했습니다. 네트워크를 확인해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form glass page-card" onSubmit={submit} noValidate>
      <div className="field">
        <span className="field-label">이메일</span>
        <p className="field-static">{email}{schoolLabel && ` · ${schoolLabel}`}</p>
      </div>

      <Field label="이름" error={errors.name}>
        <input type="text" value={values.name} onChange={set('name')} autoComplete="name" maxLength={30} required />
      </Field>

      {needsStudentId && (
        <Field label="학번" error={errors.studentId}>
          <input type="text" inputMode="numeric" value={values.studentId} onChange={set('studentId')} maxLength={12} required />
        </Field>
      )}

      <Field label="휴대폰 번호" error={errors.phone}>
        <input type="tel" value={values.phone} onChange={set('phone')} autoComplete="tel" placeholder="010-0000-0000" required />
      </Field>

      <div className="field">
        <label className="check">
          <input type="checkbox" checked={values.privacyAgreed} onChange={set('privacyAgreed')} />
          <span>
            개인정보 수집·이용에 동의합니다. <a href="/privacy" className="text-link" target="_blank">자세히</a>
          </span>
        </label>
        {errors.privacyAgreed && <p className="field-error">{errors.privacyAgreed}</p>}
      </div>

      {message && <p className="form-error" role="alert">{message}</p>}

      <div className="actions">
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? '저장 중…' : first ? '입력 완료' : '저장'}
        </button>
        {!first && <a className="btn ghost" href="/me">취소</a>}
      </div>
    </form>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
