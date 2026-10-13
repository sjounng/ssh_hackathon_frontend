import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { getUserByEmail, resolveAccess, upsertUserOnSignIn } from './lib/users.js'

// Google 로그인 (기획서 기능 2).
// 환경변수: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET — NextAuth가 이름으로 자동으로 읽는다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google({ authorization: { params: { prompt: 'select_account' } } })],
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    // 허용된 학교 도메인 또는 초청 목록의 계정만 통과. 통과하면 사용자 행을 만들거나 갱신한다
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase()
      if (!email || profile.email_verified === false) return '/login?error=unverified'
      const access = await resolveAccess(email)
      if (!access) return '/login?error=domain'
      await upsertUserOnSignIn(email, access)
      return true
    },
    // 세션 토큰에 DB의 사용자 id·역할·프로필 완료 여부를 싣는다.
    // 프로필 입력 전에는 요청마다, 그 뒤에는 1분마다 다시 읽어 역할 변경 등이 다시 로그인하지 않아도 반영되게 한다
    async jwt({ token, trigger }) {
      const stale = !token.checkedAt || Date.now() - token.checkedAt > 60_000
      if (trigger === 'signIn' || !token.uid || !token.profileCompleted || stale) {
        token.checkedAt = Date.now()
        const u = await getUserByEmail(token.email.toLowerCase())
        if (u) {
          token.uid = u.id
          token.role = u.role
          token.school = u.school
          token.profileCompleted = Boolean(u.profile_completed_at)
          if (u.name) token.name = u.name
        }
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.uid
      session.user.role = token.role
      session.user.school = token.school
      session.user.profileCompleted = token.profileCompleted
      return session
    },
  },
})

// 서버 컴포넌트·API에서 쓰는 현재 사용자 (로그인 안 했거나 인증 설정이 없으면 null)
export async function currentUser() {
  try {
    const session = await auth()
    return session?.user?.id ? session.user : null
  } catch {
    return null
  }
}
