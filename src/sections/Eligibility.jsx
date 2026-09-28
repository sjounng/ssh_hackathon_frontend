import { ELIGIBILITY, HOSTS } from '../content.js'

export default function Eligibility() {
  return (
    <section className="section" id="eligibility" data-diamond="4">
      <div className="section-head">
        <p className="eyebrow mono">OBJ-03 — Eligibility</p>
        <h2>참가 자격</h2>
        <p className="lede">{ELIGIBILITY.intro}</p>
      </div>

      <ul className="domains">
        {HOSTS.map((h) => (
          <li key={h.key} className="glass domain-card">
            <span className="domain-school"><i className={`dot ${h.key}`} />{h.name}</span>
            <span className={`domain mono ${h.domain ? '' : 'pending'}`}>{h.domain ?? '도메인 확정 예정'}</span>
          </li>
        ))}
      </ul>

      <div className="tracks">
        {ELIGIBILITY.tracks.map((t) => (
          <article className="glass track" key={t.key}>
            <div className="track-head">
              <h3>{t.title}</h3>
              <span className="chip mono">{t.badge}</span>
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
