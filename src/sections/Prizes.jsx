import { PRIZES } from '../content.js'
import Ph from '../components/Ph.jsx'

export default function Prizes() {
  return (
    <section className="section" id="prizes" data-diamond="2">
      <div className="section-head">
        <h2>상금 · 혜택</h2>
      </div>

      <div className="awards">
        {PRIZES.awards.map((a) => (
          <article className={`glass award ${a.highlight ? 'highlight' : ''}`} key={a.title}>
            <p className="award-rank">{a.title} · {a.count}</p>
            <p className="award-amount"><Ph>{a.amount}</Ph></p>
          </article>
        ))}
      </div>
      {PRIZES.note && <p className="muted prizes-note"><Ph>{PRIZES.note}</Ph></p>}

      <div className="benefits">
        <p className="label">참가자 전원</p>
        <ul>
          {PRIZES.benefits.map((b) => <li key={b}><Ph>{b}</Ph></li>)}
        </ul>
      </div>
    </section>
  )
}
