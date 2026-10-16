import { ELIGIBILITY } from '../content.js'
import Ph from '../components/Ph.jsx'

// schedule: 관리자 일정 (팀 참가 인원 조건을 함께 담고 있다)
export default function Eligibility({ schedule }) {
  const teamSize = schedule && { min: schedule.team_min_size, max: schedule.team_max_size }
  return (
    <section className="section" id="eligibility">
      <div className="section-head">
        <h2>참가 자격</h2>
      </div>

      <div className="section-body">
        <p className="lede">{ELIGIBILITY.intro}</p>
        <div className="tracks">
          {ELIGIBILITY.tracks.map((t) => (
            <article className="glass track" key={t.key}>
              <div className="track-head">
                <h3>{t.title}</h3>
                <span className="track-size"><Ph>{typeof t.badge === 'function' ? (teamSize ? t.badge(teamSize) : '[인원]') : t.badge}</Ph></span>
              </div>
              <ol>
                {t.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <p className="track-result">{t.result}</p>
            </article>
          ))}
        </div>

        <ul className="notes">
          {ELIGIBILITY.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </div>
    </section>
  )
}
