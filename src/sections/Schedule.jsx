import { PHASES, TIMETABLE } from '../content.js'
import { getCurrentPhase } from '../lib/schedule.js'
import Ph from '../components/Ph.jsx'

export default function Schedule() {
  const current = getCurrentPhase()

  return (
    <section className="section" id="schedule" data-diamond="5">
      <div className="section-head">
        <p className="eyebrow mono">OBJ-05 — Schedule</p>
        <h2>행사 일정</h2>
      </div>

      <ol className="phases">
        {PHASES.map((p, i) => (
          <li key={p.key} className={i < current ? 'done' : i === current ? 'now' : ''}>
            <span className="phase-dot" />
            <span className="phase-label">{p.label}</span>
            <span className="phase-date mono"><Ph>{p.date}</Ph></span>
            {i === current && <span className="chip mono now-chip">진행 중</span>}
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
