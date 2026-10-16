import { PRIVACY } from '../../content.js'
import Ph from '../../components/Ph.jsx'

export const metadata = { title: '개인정보 처리방침' }

// 개인정보 처리방침 (기획서 기능 0). 문구는 content.js의 PRIVACY에서 관리한다
export default function PrivacyPage() {
  return (
    <main className="page">
      <div className="page-inner">
        <h1>개인정보 처리방침</h1>
        <p className="lede"><Ph>{PRIVACY.intro}</Ph></p>

        <dl className="glass rows page-card">
          {PRIVACY.consent.map((c) => (
            <div key={c.title}>
              <dt>{c.title}</dt>
              <dd>{c.body.map((line) => <p key={line}><Ph>{line}</Ph></p>)}</dd>
            </div>
          ))}
        </dl>

        {PRIVACY.sections.map((s) => (
          <section className="glass page-card" key={s.title}>
            <div className="page-card-head">
              <h2>{s.title}</h2>
            </div>
            <ul>
              {s.items.map((item) => <li key={item}><Ph>{item}</Ph></li>)}
            </ul>
          </section>
        ))}

        <p className="note">시행일 <Ph>{PRIVACY.effective}</Ph></p>
      </div>
    </main>
  )
}
