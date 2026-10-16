import { CTA } from '../content.js'
import ApplyButton from '../components/ApplyButton.jsx'
import Ph from '../components/Ph.jsx'

// 마무리: 신청 유도 문구와 신청 버튼
export default function Cta({ schedule }) {
  return (
    <section className="cta" id="join">
      <h2><Ph>{CTA.title}</Ph></h2>
      <p className="lede">{CTA.sub}</p>
      <ApplyButton size="lg" schedule={schedule} />
    </section>
  )
}
