import { EVENT, HOSTS } from '../content.js'
import { formatEventDates } from '../lib/schedule.js'
import ApplyButton from '../components/ApplyButton.jsx'
import Ph from '../components/Ph.jsx'

// 3D 장면은 App에서 페이지 전체 배경으로 깔리고, hero는 그 위에 글만 얹는다.
// schedule: 관리자 일정 (일시는 행사 시작·종료로 그린다)
export default function Hero({ schedule }) {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="hero-kicker">{EVENT.eyebrow}</p>
        <h1><Ph>{EVENT.name}</Ph></h1>
      </div>

      <div className="hero-side">
        <dl className="hero-meta">
          <div><dt>일시</dt><dd><Ph>{formatEventDates(schedule?.event_start_at, schedule?.event_end_at)}</Ph></dd></div>
          <div><dt>장소</dt><dd><Ph>{EVENT.venue}</Ph></dd></div>
          <div>
            <dt>주최</dt>
            <dd>{HOSTS.map((h) => `${h.short} ${h.club}`).join(' · ')}</dd>
          </div>
          <div><dt>모집</dt><dd><Ph>{EVENT.capacity}</Ph></dd></div>
        </dl>
        <div className="actions">
          <ApplyButton schedule={schedule} />
          <a className="btn ghost" href="#about">행사 소개</a>
        </div>
      </div>
    </section>
  )
}
