'use client'

import { useEffect, useState } from 'react'
import { APPLY } from '../content.js'
import { formatMonthDay, getApplyStatus } from '../lib/schedule.js'

// 신청 기간에만 활성화되는 신청 버튼 (기획서 기능 1)
export default function ApplyButton({ size }) {
  // 날짜 판단은 방문자 브라우저의 현재 시각으로 한다. 계산 전(첫 렌더)에는 자리만 잡아 둔다
  const [status, setStatus] = useState(null)
  useEffect(() => setStatus(getApplyStatus()), [])
  const cls = `btn ${size === 'lg' ? 'lg' : ''}`

  if (!status) {
    return <span className={`${cls} disabled`} aria-disabled="true">참가 신청</span>
  }

  if (status.state === 'open') {
    return (
      <a className={`${cls} primary`} href={APPLY.href}>
        참가 신청하기
        <span className="btn-tag mono">D-{status.dday}</span>
      </a>
    )
  }
  return (
    <span className={`${cls} disabled`} aria-disabled="true">
      {status.state === 'before' ? `${formatMonthDay(status.opensAt)} 신청 오픈` : '신청이 마감되었습니다'}
    </span>
  )
}
