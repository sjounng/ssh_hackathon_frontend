import { EVENT, FOOTER, HOSTS } from '../content.js'
import Ph from './Ph.jsx'

// 공통 푸터: 문의 채널, 개인정보 처리방침 (기획서 기능 0)
export default function SiteFooter() {
  return (
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
  )
}
