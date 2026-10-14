import { REVIEW } from '../content.js'
import { weightShares } from '../lib/scoring.js'
import Ph from '../components/Ph.jsx'

// 평가 방식. 평가 항목은 관리자 > 심사에서 정한 값(page.jsx가 DB에서 읽어 넘긴다)
export default function Review({ criteria = [] }) {
  const shares = weightShares(criteria)
  const ranges = [...new Set(criteria.map((c) => `${Number(c.min_score)}~${Number(c.max_score)}점`))]
  const scale = !criteria.length ? '[점수 척도]' : ranges.length === 1 ? `항목마다 ${ranges[0]}입니다.` : '항목마다 배점이 다릅니다.'

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
            <dd><Ph>{p.desc.replace('{scale}', scale)}</Ph></dd>
          </div>
        ))}
      </dl>

      <div className="glass criteria">
        <div className="criteria-head">
          <h3>평가 항목</h3>
          {!criteria.length && <span className="note">기획 확정 전</span>}
        </div>
        <ul>
          {criteria.length ? criteria.map((c, i) => (
            <li key={c.name}>
              <span>{c.name}</span>
              <span className="mono">{ranges.length > 1 ? `${Number(c.max_score)}점` : `${shares[i]}%`}</span>
            </li>
          )) : <li><span><Ph>{REVIEW.criteriaPending}</Ph></span></li>}
        </ul>
      </div>
    </section>
  )
}
