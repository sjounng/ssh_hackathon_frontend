import { EVENT, HOSTS } from '../content.js'
import ApplyButton from '../components/ApplyButton.jsx'
import Ph from '../components/Ph.jsx'

// 3D 장면은 App에서 페이지 전체 배경으로 깔리고, hero는 그 위에 글만 얹는다
export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="hero-kicker">{EVENT.eyebrow}</p>
        <h1><Ph>{EVENT.name}</Ph></h1>
      </div>

      <div className="hero-side">
        <dl className="hero-meta">
          <div><dt>일시</dt><dd><Ph>{EVENT.date}</Ph></dd></div>
          <div><dt>장소</dt><dd><Ph>{EVENT.venue}</Ph></dd></div>
          <div>
            <dt>주최</dt>
            <dd>{HOSTS.map((h) => h.short).join(' · ')}</dd>
          </div>
          <div><dt>모집</dt><dd><Ph>{EVENT.capacity}</Ph></dd></div>
        </dl>
        <div className="actions">
          <ApplyButton />
          <a className="btn ghost" href="#about">행사 소개</a>
        </div>
      </div>
    </section>
  )
}
