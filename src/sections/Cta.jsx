import { CTA } from '../content.js'
import ApplyButton from '../components/ApplyButton.jsx'
import Ph from '../components/Ph.jsx'

// 마무리 페이지: 특정 유성 대신 카메라가 전체 모습으로 빠진다 (hero와 같은 구도)
export default function Cta() {
  return (
    <section className="cta" id="join" data-diamond="-1">
      <h2><Ph>{CTA.title}</Ph></h2>
      <p className="lede">{CTA.sub}</p>
      <ApplyButton size="lg" />
    </section>
  )
}
