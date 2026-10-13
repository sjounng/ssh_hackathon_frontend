import { applicationsCsv, requireAdmin } from '../../../../lib/admin.js'

// 신청 명단 내보내기 (CSV, 엑셀에서 바로 열림)
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return new Response('운영진만 접근할 수 있습니다.', { status: 403 })
  const date = new Date().toISOString().slice(0, 10)
  return new Response(await applicationsCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="applications-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
