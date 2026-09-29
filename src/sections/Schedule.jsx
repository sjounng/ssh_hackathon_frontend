'use client'

import { useEffect, useState } from 'react'
import { PHASES, TIMETABLE } from '../content.js'
import { getCurrentPhase } from '../lib/schedule.js'
import Ph from '../components/Ph.jsx'

export default function Schedule() {
  // "진행 중" 단계는 방문자 브라우저의 현재 시각으로 계산한다
  const [current, setCurrent] = useState(-1)
  useEffect(() => setCurrent(getCurrentPhase()), [])

  return (
    <section className="section" id="schedule" data-diamond="5">
      <div className="section-head">
        <h2>행사 일정</h2>
      </div>

      <ol className="phases">
        {PHASES.map((p, i) => (
          <li key={p.key} className={i < current ? 'done' : i === current ? 'now' : ''}>
            <span className="phase-dot" />
            <span className="phase-label">{p.label}</span>
            <span className="phase-date mono"><Ph>{p.date}</Ph></span>
          </li>
        ))}
      </ol>

      <h3 className="sub-title">당일 타임테이블</h3>
      <div className="timetable">
        {TIMETABLE.map((d) => (
          <div className="glass day" key={d.day}>
            <p className="day-head">
              <span className="mono">{d.day}</span>
              <span><Ph>{d.date}</Ph></span>
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
    </section>
  )
}
