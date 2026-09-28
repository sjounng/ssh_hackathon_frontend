import { PRIZES } from '../content.js'
import Ph from '../components/Ph.jsx'

export default function Prizes() {
  return (
    <section className="section" id="prizes" data-diamond="2">
      <div className="section-head">
        <p className="eyebrow mono">OBJ-02 — Prizes</p>
        <h2>상금 · 혜택</h2>
      </div>

      <div className="awards">
        {PRIZES.awards.map((a) => (
          <article className={`glass award ${a.highlight ? 'highlight' : ''}`} key={a.rank}>
            <p className="award-rank">{a.rank}</p>
            <p className="award-amount"><Ph>{a.amount}</Ph></p>
            <p className="award-count mono"><Ph>{a.count}</Ph></p>
          </article>
        ))}
      </div>

      <div className="benefits">
        <p className="eyebrow mono">참가자 전원</p>
        <ul>
          {PRIZES.benefits.map((b) => <li key={b}><Ph>{b}</Ph></li>)}
        </ul>
      </div>
    </section>
  )
}
