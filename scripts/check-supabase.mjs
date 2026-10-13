// Supabase 연결 점검 (키 값은 출력하지 않는다)
// 실행: node --env-file=.env.local scripts/check-supabase.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.log('✗ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 비어 있습니다')
  process.exit(1)
}
console.log(`키 종류: ${key.startsWith('sb_secret_') ? 'Secret key (sb_secret_)' : key.startsWith('sb_publishable_') ? '⚠ Publishable key — Secret key가 필요합니다' : key.startsWith('eyJ') ? 'Legacy JWT 키' : '알 수 없음'}`)

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const tables = ['allowed_domains', 'invited_emails', 'users', 'event_config', 'teams', 'team_members', 'applications', 'submissions', 'criteria', 'scores', 'awards', 'email_logs']
let ok = true

for (const t of tables) {
  const { count, error } = await db.from(t).select('*', { count: 'exact', head: true })
  if (error) {
    ok = false
    console.log(`✗ ${t}: ${error.message}`)
  } else console.log(`✓ ${t} (${count}행)`)
}

const { data: domains } = await db.from('allowed_domains').select('domain')
if (domains) console.log(`  허용 도메인: ${domains.map((d) => d.domain).join(', ')}`)

// 신청 함수: 존재하지 않는 사용자로 호출 → 함수가 있으면 USER_NOT_FOUND, 없으면 함수 없음 오류
const { error: fnErr } = await db.rpc('apply_create_team', { p_user: '00000000-0000-0000-0000-000000000000', p_name: '연결 점검' })
if (fnErr?.message === 'USER_NOT_FOUND' || fnErr?.message === 'APPLY_CLOSED') console.log('✓ 참가 신청 함수 (0002_apply.sql)')
else {
  ok = false
  console.log(`✗ 참가 신청 함수: ${fnErr?.message ?? '예상과 다른 응답'}`)
}

// 이후 마이그레이션: 없는 사용자로 호출해 함수가 있는지만 본다 (있으면 정해진 오류 코드가 돌아온다)
const NOBODY = '00000000-0000-0000-0000-000000000000'
for (const [file, label, fn, params, codes] of [
  ['0003_admin.sql', '관리자 함수', 'admin_assert', { p_admin: NOBODY }, ['NOT_ADMIN']],
  ['0004_team.sql', '내 팀·결과물 함수', 'team_set_role', { p_user: NOBODY, p_role: 'x' }, ['NOT_APPROVED']],
]) {
  const { error } = await db.rpc(fn, params)
  if (codes.includes(error?.message)) console.log(`✓ ${label} (${file})`)
  else {
    ok = false
    console.log(`✗ ${label} (${file}): ${error?.message ?? '예상과 다른 응답'} — SQL Editor에서 ${file}을 실행했는지 확인`)
  }
}

const { data: buckets, error: bErr } = await db.storage.listBuckets()
if (bErr) console.log(`✗ 파일 저장소: ${bErr.message}`)
else console.log(`${buckets.some((b) => b.id === 'submissions') ? '✓' : '✗'} 파일 저장소 버킷 'submissions'`)

console.log(ok ? '\n연결 정상' : '\n일부 확인 실패')
