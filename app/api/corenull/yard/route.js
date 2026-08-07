// CoreNull - Yard API
// 마당(현재) = 광장 뷰 재사용 (전체 공개 Room, 관계 무관)
// Room Card 단위로 반환한다 — 포스트 개별이 아니라 "최근 활동이 있는 공개 방" 목록.
// 이웃(나+이웃) 필터는 ADR-ACCESS-002(Neighbor Relationship) 완료 후 여기에 추가된다.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET') return handleGet(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '30')

  const { getSupabase } = await import('@/lib/supabase')
  const { attachRoomStages, attachLatestMessages } = await import('@/lib/roomStage')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: rooms, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('id, room_name, house_id, visibility, seed_mode, bloom_date, created_at, corenull_houses(id, title, primary_language)')
    .eq('visibility', 'public')

  if (roomError) return Response.json({ _error: roomError.message, traceId }, { status: 500 })
  if (!rooms || rooms.length === 0) return Response.json({ data: [], traceId })

  let enriched = await attachRoomStages(supabase, rooms)
  enriched = await attachLatestMessages(supabase, enriched)

  // 최근 활동(글)이 없는 방은 마당에 보여줄 게 없다 — "방 소개"가 아니라
  // "최근 활동"을 보여주는 카드이므로, 활동 없는 방은 목록에서 제외한다.
  const withActivity = enriched.filter((r) => r.latest_message)
  withActivity.sort(
    (a, b) => new Date(b.latest_message.created_at).getTime() - new Date(a.latest_message.created_at).getTime()
  )

  const data = withActivity.slice(0, limit).map((r) => ({
    id: r.id,
    room_name: r.room_name,
    visibility: r.visibility,
    house_id: r.house_id,
    house_title: r.corenull_houses?.title || null,
    house_language: r.corenull_houses?.primary_language || null,
    stage: r.stage,
    latest_message: r.latest_message,
  }))

  return Response.json(
    { data, traceId },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  )
}

export { handler as GET }