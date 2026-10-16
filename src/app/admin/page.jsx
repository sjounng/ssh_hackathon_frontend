import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '../../auth.js'
import { getAdminData, requireAdmin } from '../../lib/admin.js'
import AdminConsole from '../../components/AdminConsole.jsx'

export const metadata = { title: '관리자' }

// 관리자 (기획서 기능 9). 운영진 여부는 DB의 현재 역할로 확인한다
export default async function AdminPage() {
  if (!(await currentUser())) redirect('/login')
  const admin = await requireAdmin()
  if (!admin) {
    return (
      <main className="page">
        <div className="page-inner">
          <h1>관리자</h1>
          <p className="lede">운영진만 접근할 수 있습니다.</p>
          <Link className="btn ghost" href="/">메인으로</Link>
        </div>
      </main>
    )
  }
  return (
    <main className="page">
      <div className="page-inner admin">
        <AdminConsole initial={await getAdminData()} adminId={admin.id} />
      </div>
    </main>
  )
}
