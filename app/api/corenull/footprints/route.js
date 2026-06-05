// CoreNull - Footprints API
// 발자취 조회 (자동 방문 기록)
// 방문 기록은 posts GET에서 자동 생성됨 — 여기선 조회만

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const owner_key = searchParams.get('owner_key')

  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 발자취 + 방 정보 함께 조회
  const { data, error } = await supabase
    .from('corenull_footprints')
    .select('*')
    .eq('owner_key', owner_key)
    .order('visited_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as GET }