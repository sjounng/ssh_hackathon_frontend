// 안내 메일 실제 발송 점검: 문구를 모두(선발 결과 3통 + 팀 배정 1통) 지정한 주소로 보낸다. 발송 기록은 남기지 않는다
// 실행: npm run mail:test -- 받을주소@example.com
// 견본은 실제 대상이 있으면 그 사람의 내용, 없으면 예시 값으로 채운다 (관리자 페이지 > 메일 > 나에게 테스트 발송과 같다)
import { mailConfig, sendTestMail } from '../src/lib/mail.js'

const to = process.argv[2]
if (!to || !to.includes('@')) {
  console.log('받을 주소를 넣어 주세요: npm run mail:test -- 받을주소@example.com')
  process.exit(1)
}

const { ready, from, testing } = mailConfig()
if (!ready) {
  console.log('✗ RESEND_API_KEY / MAIL_FROM이 비어 있습니다 (.env.local)')
  process.exit(1)
}
console.log(`발신 ${from}${testing ? ' (테스트 주소: Resend 계정 주인 메일로만 보내진다)' : ''} → 수신 ${to}`)

// 발신 도메인 인증 상태 (전체 권한 키일 때만 볼 수 있다)
const domain = from.match(/@([^>\s]+)>?$/)?.[1]
const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } })
if (res.ok) {
  const { data = [] } = await res.json()
  const d = data.find((x) => x.name === domain)
  console.log(d ? `${d.status === 'verified' ? '✓' : '✗'} 발신 도메인 ${domain}: ${d.status}` : `✗ 발신 도메인 ${domain}이 Resend에 등록되어 있지 않습니다`)
} else {
  console.log(`- 발신 도메인 상태는 확인하지 못했습니다 (키 권한: 발송 전용일 수 있음, 응답 ${res.status})`)
}

// 메일 속 링크는 운영 주소로 (README의 배포 주소)
const SITE = 'https://ssh-hackathon-frontend.vercel.app'
let ok = true
for (const [kind, label] of [['selection_result', '선발 결과'], ['team_assignment', '팀 배정']]) {
  try {
    const r = await sendTestMail({ email: to }, kind, SITE)
    console.log(`✓ ${label} ${r.sent}통 보냄`)
  } catch (e) {
    ok = false
    console.log(`✗ ${label}: ${e.message}`)
  }
}
process.exit(ok ? 0 : 1)
