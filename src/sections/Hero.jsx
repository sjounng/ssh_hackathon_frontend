import { EVENT, HOSTS } from '../content.js'
import { formatEventRange, formatMonthDayWeek } from '../lib/schedule.js'
import ApplyButton from '../components/ApplyButton.jsx'
import Ph from '../components/Ph.jsx'
import { LogoFull } from '../components/Logo.jsx'

// 첫 화면 (포스터 구성): 재단선·가로선 틀 안에 주최 → 로고(마크·행사명·부제) → ◆ 일정 · 장소 · 신청 기간 · 모집.
// schedule: 관리자 일정 (page.jsx가 DB에서 읽어 넘긴다)
export default function Hero({ schedule: s }) {
  const plan = [
    formatEventRange(s?.event_start_at, s?.event_end_at),
    s?.selection_announce_at && `선발 발표 ${formatMonthDayWeek(s.selection_announce_at)}`,
    s?.team_assign_at && `팀 배정 ${formatMonthDayWeek(s.team_assign_at)}`,
  ].filter(Boolean)
  const teamSize = s ? `${s.team_min_size}~${s.team_max_size}인 팀` : '[인원]'

  return (
    <section className="hero" id="top">
      <div className="frame">
        <i className="crop tl" /><i className="crop tr" /><i className="crop bl" /><i className="crop br" />
        <p className="hero-kicker">{HOSTS.map((h) => `${h.name} ${h.club}`).join(' × ')}</p>
        <h1 className="hero-title">
          <LogoFull className="hero-logo" label={`${EVENT.name} ${EVENT.subtitle}`} />
        </h1>

        <dl className="hero-info">
          <div>
            <dt>일정</dt>
            <dd><ul className="bullets">{plan.map((p) => <li key={p}><Ph>{p}</Ph></li>)}</ul></dd>
          </div>
          <div>
            <dt>장소</dt>
            <dd>{EVENT.venue.map((v) => <span key={v}>{v}</span>)}</dd>
          </div>
          <div>
            <dt>신청 기간</dt>
            <dd>
              <span><Ph>{formatMonthDayWeek(s?.apply_open_at)}</Ph></span>
              <span>~ <Ph>{formatMonthDayWeek(s?.apply_close_at)}</Ph></span>
            </dd>
          </div>
          <div>
            <dt>모집</dt>
            <dd>
              <span>{EVENT.capacity} · <Ph>{teamSize}</Ph></span>
              <span>{EVENT.fee}</span>
            </dd>
          </div>
        </dl>

        <div className="actions hero-actions">
          <ApplyButton schedule={s} />
          <a className="btn ghost" href="#about">행사 소개</a>
        </div>
      </div>
    </section>
  )
}
