import { ABOUT, EVENT } from '../content.js'
import Ph from '../components/Ph.jsx'

export default function About() {
  return (
    <section className="section" id="about" data-diamond="1">
      <div className="section-head">
        <p className="eyebrow mono">OBJ-01 — About</p>
        <h2><Ph>{ABOUT.title}</Ph></h2>
      </div>

      <div className="about-grid">
        <div className="about-body">
          <p className="lede"><Ph>{EVENT.summary}</Ph></p>
          {ABOUT.body.map((p, i) => <p key={i}><Ph>{p}</Ph></p>)}
          <dl className="stats">
            {ABOUT.stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd><Ph>{s.value}</Ph></dd>
              </div>
            ))}
          </dl>
        </div>

        <article className="glass topic">
          <p className="eyebrow mono">{ABOUT.topic.label}</p>
          <h3><Ph>{ABOUT.topic.title}</Ph></h3>
          <p><Ph>{ABOUT.topic.desc}</Ph></p>
        </article>
      </div>
    </section>
  )
}
