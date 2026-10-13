'use client'

import { useState } from 'react'

// /api/team 호출: 성공하면 새 상태로 바꾸고, 실패하면 안내 문구를 남긴다
export default function useTeamApi(initial) {
  const [state, setState] = useState(initial)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function call(action, payload = {}) {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (data.state) setState(data.state)
      throw new Error(data.error ?? '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    return data
  }

  async function act(action, payload) {
    setBusy(true)
    setError(null)
    try {
      setState(await call(action, payload))
      return true
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? '처리하지 못했습니다. 네트워크를 확인해 주세요.' : e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  return { state, error, setError, busy, act, call }
}
