import 'server-only'
import { createClient } from '@supabase/supabase-js'

// 서버 전용 Supabase 클라이언트 (service role 키).
// 브라우저 코드에서 import하면 빌드가 실패하도록 'server-only'를 건다. 권한 확인은 이 클라이언트를 쓰는 서버 코드의 몫이다.
let client

export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다')
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}
