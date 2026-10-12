import { redirect } from 'next/navigation'
import { currentUser, signIn } from '../../auth.js'

export const metadata = { title: '로그인 · 연합 해커톤' }

const ERRORS = {
  domain: '주최 학교 Google 계정(또는 초청받은 계정)으로만 로그인할 수 있습니다.',
  unverified: '이메일 인증이 끝난 Google 계정만 사용할 수 있습니다.',
  default: '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}

// 로그인 (기획서 기능 2): 학교 Google 계정으로만 로그인. 허용 여부는 auth.js의 signIn 콜백에서 확인한다
export default async function LoginPage({ searchParams }) {
  const me = await currentUser()
  if (me) redirect(me.profileCompleted ? '/me' : '/me/profile')

  const { error } = await searchParams
  const message = error ? (ERRORS[error] ?? ERRORS.default) : null

  async function loginWithGoogle() {
    'use server'
    await signIn('google', { redirectTo: '/me' })
  }

  return (
    <main className="page">
      <div className="page-inner narrow">
        <h1>로그인</h1>
        <p className="lede">주최 학교 Google 계정으로 로그인합니다. 처음 로그인하면 간단한 정보를 입력합니다.</p>
        {message && <p className="form-error" role="alert">{message}</p>}
        <form action={loginWithGoogle} className="login-form">
          <button className="btn primary lg" type="submit">Google 계정으로 계속하기</button>
        </form>
      </div>
    </main>
  )
}
