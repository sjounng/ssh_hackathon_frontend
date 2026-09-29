import { REVIEW } from '../content.js'
import Ph from '../components/Ph.jsx'

export default function Review() {
  return (
    <section className="section" id="review" data-diamond="3">
      <div className="section-head">
        <h2>평가 방식</h2>
        <p className="lede">{REVIEW.intro}</p>
      </div>

      <dl className="glass rows">
        {REVIEW.principles.map((p) => (
          <div key={p.title}>
            <dt>{p.title}</dt>
            <dd><Ph>{p.desc}</Ph></dd>
          </div>
        ))}
      </dl>

      <div className="glass criteria">
        <div className="criteria-head">
          <h3>평가 항목</h3>
          <span className="note">기획 확정 전</span>
        </div>
        <ul>
          {REVIEW.criteria.map((c) => (
            <li key={c.name}>
              <span><Ph>{c.name}</Ph></span>
              <span className="mono"><Ph>{c.weight}</Ph></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
