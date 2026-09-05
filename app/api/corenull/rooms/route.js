// CoreNull - Room API
// 방 생성 / 조회 / 수정 (집주인만 가능)
// GET ?room_id=        → 단건 조회
// GET ?house_id=       → 특정 House의 방 목록
// GET ?scope=plaza     → 광장 — 모든 House의 public 방 전역 조회
//
// NOTE(2026-09-04): 광장을 위해 새 API(/api/corenull/plaza)를 만들지 않고
// 이 라우트에 scope=plaza로 조회 범위만 확장했다 (API 슬롯 절약 결정).
// Master View §2/§3: 광장의 발견 단위는 House가 아니라 Room이므로,
// House 목록이 아니라 public Room 목록을 반환한다. RoomCard가 바로 쓸 수
// 있도록 room.stage/room.latest_message까지 lib/roomStage.js Adapter로
// 붙여서 내려준다 — 계산 로직을 이 파일에 새로 만들지 않는다.

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
  const scope = searchParams.get('scope')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  if (room_id) {
    const { data, error } = await supabase
      .from('corenull_rooms')
      .select('*')
      .eq('id', room_id)
      .single()
    if (error || !data) return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
    return Response.json({ room: data, traceId })
  }

  // 광장 — 모든 House의 public 방 전역 조회
  if (scope === 'plaza') {
    const limit = parseInt(searchParams.get('limit') || '30')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: rooms, error } = await supabase
      .from('corenull_rooms')
      .select('*, corenull_houses(id, title, primary_language)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    if (!rooms || rooms.length === 0) return Response.json({ data: [], traceId })

    // RoomCard가 필요로 하는 stage/latest_message를 Adapter로 일괄 부착.
    // 이 파일에서 직접 계산하지 않는다 — 중복 로직 금지(Anchor §7).
    const { attachRoomStages, attachLatestMessages } = await import('@/lib/roomStage')
    const withStage = await attachRoomStages(supabase, rooms)
    const withLatest = await attachLatestMessages(supabase, withStage)

    // RoomCard는 room.corenull_houses가 아니라 카드 자체엔 House 정보가
    // 필요 없다(광장에서 클릭하면 House의 마당으로 이동 — 그 이동 목적지
    // house_id만 있으면 됨). house 표시가 필요해지면 호출부가 이 필드를
    // 그대로 꺼내 쓰면 된다 — 여기서 shape을 더 가공하지 않는다.
    return Response.json({ data: withLatest, traceId })
  }

  if (!house_id) {
    return Response.json({ _error: 'house_id_or_room_id_or_scope_required', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_rooms')
    .select('*')
    .eq('house_id', house_id)
    .order('created_at', { ascending: true })
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
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
  const { room_id, owner_key, room_name, visibility, seed_mode, bloom_date } = body

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
  // seed_mode는 boolean이라 falsy(false) 체크로는 "끄기"가 무시되므로
  // undefined인지로 판단 — false도 유효한 업데이트 값이다.
  if (seed_mode !== undefined) updatePayload.seed_mode = seed_mode
  if (bloom_date !== undefined) updatePayload.bloom_date = bloom_date

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