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

  // 발자취 + 방 이름 join
  const { data, error } = await supabase
    .from('corenull_footprints')
    .select('*, corenull_rooms(id, room_name)')
    .eq('owner_key', owner_key)
    .order('visited_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  // room_id 기준 중복 제거 — 가장 최근 방문 1개만
  const seen = new Set()
  const deduped = (data || []).filter(fp => {
    if (seen.has(fp.room_id)) return false
    seen.add(fp.room_id)
    return true
  })

  return Response.json({ data: deduped, traceId })
}

export { handler as GET }