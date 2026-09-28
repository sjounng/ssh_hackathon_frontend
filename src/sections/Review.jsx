import { REVIEW } from '../content.js'
import Ph from '../components/Ph.jsx'

export default function Review() {
  return (
    <section className="section" id="review" data-diamond="3">
      <div className="section-head">
        <p className="eyebrow mono">OBJ-04 — Review</p>
        <h2>평가 방식</h2>
        <p className="lede">{REVIEW.intro}</p>
      </div>

      <div className="principles">
        {REVIEW.principles.map((p, i) => (
          <article className="glass principle" key={p.title}>
            <span className="index mono">{String(i + 1).padStart(2, '0')}</span>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
          </article>
        ))}
      </div>

      <div className="glass criteria">
        <div className="criteria-head">
          <h3>평가 항목</h3>
          {/* 1~5점 척도 예시 */}
          <div className="scale" aria-label="1점부터 5점까지 선택">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n === 4 ? 'on' : ''}>{n}</span>
            ))}
          </div>
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
