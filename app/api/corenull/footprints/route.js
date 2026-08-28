// CoreNull - Footprints API
// 발자취 조회 (자동 방문 기록)
// 방문 기록은 posts GET에서 자동 생성됨 — 여기선 조회만
//
// NOTE(2026-08-26): House join 추가. FootprintRow(발자취 전용 블록)가
// "어느 집을 방문했는지"를 주 정보로 보여줘야 하는데, 기존엔
// corenull_rooms(room_name)까지만 join해서 House 정보가 없었다.
// House가 기억의 기준점이라는 판단(보카다) 반영 — Room 안쪽에
// corenull_houses(title)까지 nested select로 가져온다.

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

  // 발자취 + 방 이름 + 집 이름까지 join
  const { data, error } = await supabase
    .from('corenull_footprints')
    .select('*, corenull_rooms(id, room_name, house_id, corenull_houses(id, title))')
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

  // FootprintRow가 바로 쓸 수 있는 평평한 shape으로 정리
  const result = deduped.map(fp => ({
    id: fp.id,
    room_id: fp.room_id,
    room_name: fp.corenull_rooms?.room_name || null,
    house_name: fp.corenull_rooms?.corenull_houses?.title || null,
    house_id: fp.corenull_rooms?.house_id || null,
    visited_at: fp.visited_at,
  }))

  return Response.json({ data: result, traceId })
}

export { handler as GET }