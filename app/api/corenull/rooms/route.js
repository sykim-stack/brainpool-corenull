// CoreNull - Room API
// 방 생성 / 조회 / 수정 (집주인만 가능)
// GET ?room_id=  단건 조회 — ADR-ACCESS-001 접근 제어 적용
// GET ?house_id= 목록 조회 — ADR-ACCESS-001 접근 제어 적용 (family 방은 필터링됨)
//
// 접근 제어는 항상 lib/accessPolicy.js의 canReadRoom()만 호출한다.
// visibility/owner_key를 이 파일에서 직접 비교하지 않는다. (Engine Contract)
export const dynamic = 'force-dynamic'

const COREHUB_URL = 'https://brainpool-corehub.vercel.app/api/corehub/facts'

const pushFact = (fact) => {
  fetch(COREHUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fact),
  }).catch(() => null) // fire-and-forget — 실패해도 CoreNull 영향 없음
}

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET')   return handleGet(req, traceId)
  if (req.method === 'POST')  return handlePost(req, traceId)
  if (req.method === 'PATCH') return handlePatch(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const room_id = searchParams.get('room_id')
  const owner_key = searchParams.get('owner_key')

  const { getSupabase } = await import('@/lib/supabase')
  const { canReadRoom } = await import('@/lib/accessPolicy')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  if (room_id) {
    const { data, error } = await supabase
      .from('corenull_rooms')
      .select('*')
      .eq('id', room_id)
      .single()
    if (error || !data) return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })

    const access = await canReadRoom(supabase, data, owner_key)
    if (!access.allowed) {
      return Response.json({ _error: access._error || 'ACCESS_DENIED', traceId }, { status: 500 })
    }

    return Response.json({ room: data, traceId })
  }

  if (!house_id) {
    return Response.json({ _error: 'house_id_or_room_id_required', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_rooms')
    .select('*')
    .eq('house_id', house_id)
    .order('created_at', { ascending: true })
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  // ADR-ACCESS-001: 목록 조회도 단건 조회와 동일한 정책 엔진(canReadRoom)을 통과한다.
  // family 방은 owner/participant가 아니면 목록 자체에서 제외된다.
  const accessResults = await Promise.all(
    (data || []).map((room) => canReadRoom(supabase, room, owner_key))
  )
  const visibleRooms = (data || []).filter((_, i) => accessResults[i].allowed)

  return Response.json({ data: visibleRooms, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, owner_key, room_name, room_type, visibility, seed_mode, bloom_date, slug } = body

  if (!house_id || !owner_key || !room_name) {
    return Response.json({ _error: 'house_id_owner_key_room_name_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: house, error: houseError } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', house_id)
    .eq('owner_key', owner_key)
    .single()
  if (houseError || !house) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_rooms')
    .insert({
      house_id,
      room_name,
      room_type: room_type || 'normal',
      visibility: visibility || 'public',
      seed_mode: seed_mode || false,
      bloom_date: bloom_date || null,
      slug: slug || null,
    })
    .select()
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  // CoreHub Fact Push — seed_mode인 경우만
  if (data.seed_mode) {
    pushFact({
      source: 'CoreNull',
      fact_type: 'space.seed.created',
      owner_key,
      house_id,
      payload: { room_id: data.id, bloom_date: data.bloom_date || null },
    })
  }

  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, room_name, visibility } = body

  if (!room_id || !owner_key) {
    return Response.json({ _error: 'room_id_and_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: room, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('house_id')
    .eq('id', room_id)
    .single()
  if (roomError || !room) return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })

  const { data: house, error: houseError } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', room.house_id)
    .eq('owner_key', owner_key)
    .single()
  if (houseError || !house) return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })

  const updatePayload = {}
  if (room_name) updatePayload.room_name = room_name
  if (visibility) updatePayload.visibility = visibility

  const { data, error } = await supabase
    .from('corenull_rooms')
    .update(updatePayload)
    .eq('id', room_id)
    .select()
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST, handler as PATCH }