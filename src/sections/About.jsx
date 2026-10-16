import { ABOUT, EVENT } from '../content.js'
import Ph from '../components/Ph.jsx'

export default function About() {
  return (
    <section className="section" id="about">
      <div className="section-head">
        <h2><Ph>{ABOUT.title}</Ph></h2>
      </div>

      <div className="section-body about-grid">
        <div className="about-body">
          <p className="lede"><Ph>{EVENT.summary}</Ph></p>
          {ABOUT.body.map((p, i) => <p key={i}><Ph>{p}</Ph></p>)}
        </div>

        <article className="glass topic">
          <p className="label">{ABOUT.topic.label}</p>
          <h3><Ph>{ABOUT.topic.title}</Ph></h3>
          <p><Ph>{ABOUT.topic.desc}</Ph></p>
        </article>
      </div>
    </section>
  )
}
