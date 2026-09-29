import { ELIGIBILITY } from '../content.js'

export default function Eligibility() {
  return (
    <section className="section" id="eligibility" data-diamond="4">
      <div className="section-head">
        <h2>참가 자격</h2>
        <p className="lede">{ELIGIBILITY.intro}</p>
      </div>

      <div className="tracks">
        {ELIGIBILITY.tracks.map((t) => (
          <article className="glass track" key={t.key}>
            <div className="track-head">
              <h3>{t.title}</h3>
              <span className="track-size">{t.badge}</span>
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
    </section>
  )
}
