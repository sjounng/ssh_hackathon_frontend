'use client'

import { useEffect, useState } from 'react'
import { TIMETABLE } from '../content.js'
import { buildPhases, formatEventDay, getCurrentPhase } from '../lib/schedule.js'
import Ph from '../components/Ph.jsx'

// schedule: 관리자 일정 (page.jsx가 DB에서 읽어 넘긴다)
export default function Schedule({ schedule }) {
  const phases = buildPhases(schedule)
  // "진행 중" 단계는 방문자 브라우저의 현재 시각으로 계산한다
  const [current, setCurrent] = useState(-1)
  useEffect(() => setCurrent(getCurrentPhase(buildPhases(schedule))), [schedule])

  return (
    <section className="section" id="schedule">
      <div className="section-head">
        <h2>행사 일정</h2>
      </div>

      <div className="section-body">
        <ol className="phases">
          {phases.map((p, i) => (
            <li key={p.key} className={i < current ? 'done' : i === current ? 'now' : ''}>
              <span className="phase-dot" />
              <span className="phase-label">{p.label}</span>
              <span className="phase-date mono"><Ph>{p.date}</Ph></span>
            </li>
          ))}
        </ol>

        <h3 className="sub-title">당일 타임테이블</h3>
        <div className="timetable">
          {TIMETABLE.map((d, i) => (
            <div className="glass day" key={d.day}>
              <p className="day-head">
                <span className="mono">{d.day}</span>
                <span><Ph>{formatEventDay(schedule?.event_start_at, i)}</Ph></span>
              </p>
              <ul>
                {d.rows.map((r, i) => (
                  <li key={i}>
                    <span className="mono"><Ph>{r.time}</Ph></span>
                    <span><Ph>{r.title}</Ph></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
