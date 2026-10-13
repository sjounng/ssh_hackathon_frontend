import Link from 'next/link'

// 참가자 전용 페이지에 심사위원·운영진 계정이 들어왔을 때
export default function NotParticipant({ title }) {
  return (
    <main className="page">
      <div className="page-inner">
        <h1>{title}</h1>
        <p className="lede">참가자 계정에서만 쓰는 페이지입니다. 운영진은 관리자 페이지에서 팀과 결과물을 확인할 수 있습니다.</p>
        <Link className="btn ghost" href="/me">내 정보</Link>
      </div>
    </main>
  )
}
