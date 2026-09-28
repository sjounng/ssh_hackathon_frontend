import { CTA, EVENT, FOOTER, HOSTS } from '../content.js'
import ApplyButton from '../components/ApplyButton.jsx'
import Ph from '../components/Ph.jsx'

export default function Footer() {
  return (
    <>
      {/* 마무리 페이지: 특정 유성 대신 카메라가 전체 모습으로 빠진다 (hero와 같은 구도) */}
      <section className="cta" data-diamond="-1">
        <h2><Ph>{CTA.title}</Ph></h2>
        <p className="lede">{CTA.sub}</p>
        <ApplyButton size="lg" />
      </section>

      <footer className="footer">
        <div className="footer-top">
          <div>
            <p className="footer-name"><Ph>{EVENT.name}</Ph></p>
            <p className="footer-hosts">
              {HOSTS.map((h) => (
                <span key={h.key}><i className={`dot ${h.key}`} />{h.name}</span>
              ))}
            </p>
          </div>
          <div className="footer-links">
            <p className="eyebrow mono">문의</p>
            {FOOTER.contacts.map((c) => (
              <a key={c.label} href={c.href}><Ph>{c.label}</Ph></a>
            ))}
          </div>
        </div>
        <div className="footer-bottom mono">
          <a href={FOOTER.privacyHref}>개인정보 처리방침</a>
          <span><Ph>{FOOTER.copyright}</Ph></span>
        </div>
      </footer>
    </>
  )
}
