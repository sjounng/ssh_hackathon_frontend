import { redirect } from 'next/navigation'
import { currentUser } from '../../../auth.js'
import { SCHOOL_LABEL, getUserById } from '../../../lib/users.js'
import ProfileForm from '../../../components/ProfileForm.jsx'

export const metadata = { title: '정보 입력' }

// 최초 로그인 시 필수 정보 입력, 이후에는 정보 수정
export default async function ProfilePage() {
  const me = await currentUser()
  if (!me) redirect('/login')
  const user = await getUserById(me.id)
  if (!user) redirect('/login')

  const first = !user.profile_completed_at
  return (
    <main className="page">
      <div className="page-inner narrow">
        <h1>{first ? '정보 입력' : '정보 수정'}</h1>
        <p className="lede">
          {first ? '처음 로그인하셨습니다. 참가 신청과 안내에 쓰일 정보를 입력해 주세요.' : '연락처 등 정보를 수정할 수 있습니다.'}
        </p>
        <ProfileForm
          first={first}
          email={user.email}
          schoolLabel={user.school ? SCHOOL_LABEL[user.school] : null}
          needsStudentId={user.school !== null}
          initial={{
            name: user.name ?? '',
            studentId: user.student_id ?? '',
            phone: user.phone ?? '',
            privacyAgreed: Boolean(user.privacy_agreed_at),
          }}
        />
      </div>
    </main>
  )
}
