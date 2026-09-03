// CoreNull - House API
// 집 생성 / 조회
// action=neighbors|neighbor-request|neighbor-accept|neighbor-remove → ADR-ACCESS-002 Neighbor 기능 (슬롯 재사용)

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (req.method === 'GET') {
    if (action === 'neighbors') return handleNeighborsList(req, traceId)
    return handleGet(req, traceId)
  }
  if (req.method === 'POST') {
    if (action === 'neighbor-request') return handleNeighborRequest(req, traceId)
    return handlePost(req, traceId)
  }
  if (req.method === 'PATCH') {
    if (action === 'neighbor-accept') return handleNeighborAccept(req, traceId)
    return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
  }
  if (req.method === 'DELETE') {
    if (action === 'neighbor-remove') return handleNeighborRemove(req, traceId)
    return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
  }

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

// ─── 기존 House 로직 (변경 없음) ────────────────────────────

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const owner_key = searchParams.get('owner_key')
  const house_id = searchParams.get('house_id')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  if (house_id) {
    const { data, error } = await supabase
      .from('corenull_houses')
      .select('*')
      .eq('id', house_id)
      .single()

    if (error || !data) return Response.json({ _error: 'house_not_found', traceId }, { status: 500 })

    return Response.json({ house: data, traceId })
  }

  if (!owner_key) {
    return Response.json({ _error: 'owner_key_or_house_id_required', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_houses')
    .select('*, corenull_rooms(*)')
    .eq('owner_key', owner_key)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { owner_key, title, description, slug, primary_language } = body

  if (!owner_key || !title) {
    return Response.json({ _error: 'owner_key_and_title_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: house, error } = await supabase
    .from('corenull_houses')
    .insert({ owner_key, title, description, slug: slug || null, primary_language: primary_language || 'ko' })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  await supabase
    .from('corenull_rooms')
    .insert({
      house_id: house.id,
      room_name: '일상',
      room_type: 'normal',
      visibility: 'public',
      seed_mode: false,
    })

  return Response.json({ data: house, traceId })
}

// ─── Neighbor (ADR-ACCESS-002) ─────────────────────────────

// 목록 조회 — 골목(NeighborContentBlock)용. 방향(outgoing/incoming) 표시
const handleNeighborsList = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')

  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: rows, error } = await supabase
    .from('corenull_neighbors')
    .select('*')
    .or(`house_a_id.eq.${house_id},house_b_id.eq.${house_id}`)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  // 상대방 House 정보 join (마당/거실 어디서든 재사용하는 House select 패턴)
  const otherIds = (rows || []).map(r => r.house_a_id === house_id ? r.house_b_id : r.house_a_id)
  let housesMap = {}
  if (otherIds.length > 0) {
    const { data: houses } = await supabase
      .from('corenull_houses')
      .select('id, title, primary_language')
      .in('id', otherIds)
    housesMap = Object.fromEntries((houses || []).map(h => [h.id, h]))
  }

  const data = (rows || []).map(r => {
    const isRequester = r.house_a_id === house_id
    const otherId = isRequester ? r.house_b_id : r.house_a_id
    return {
      id: r.id,
      status: r.status,
      direction: isRequester ? 'outgoing' : 'incoming',
      requested_at: r.requested_at,
      responded_at: r.responded_at,
      house: housesMap[otherId] || null,
    }
  })

  return Response.json({ data, traceId })
}

// 신청 — house_a(요청자) owner만 가능
const handleNeighborRequest = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_a_id, owner_key, house_b_id } = body

  if (!house_a_id || !owner_key || !house_b_id) {
    return Response.json({ _error: 'house_a_id_owner_key_house_b_id_required', traceId }, { status: 500 })
  }
  if (house_a_id === house_b_id) {
    return Response.json({ _error: 'cannot_neighbor_self', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 요청자 House 소유 검증
  const { data: houseA } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', house_a_id)
    .eq('owner_key', owner_key)
    .single()
  if (!houseA) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  // 대상 House 존재 검증
  const { data: houseB } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', house_b_id)
    .single()
  if (!houseB) {
    return Response.json({ _error: 'target_house_not_found', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_neighbors')
    .insert({ house_a_id, house_b_id, status: 'pending' })
    .select()
    .single()

  if (error) {
    // idx_neighbors_unique_pair 위반 — 이미 pending/accepted 관계 존재
    if (error.code === '23505') {
      return Response.json({ _error: 'already_requested_or_neighbors', traceId }, { status: 500 })
    }
    return Response.json({ _error: error.message, traceId }, { status: 500 })
  }

  return Response.json({ data, traceId })
}

// 수락 — house_b(수신자) owner만 가능
const handleNeighborAccept = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { neighbor_id, owner_key } = body

  if (!neighbor_id || !owner_key) {
    return Response.json({ _error: 'neighbor_id_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: neighbor, error: fetchError } = await supabase
    .from('corenull_neighbors')
    .select('*')
    .eq('id', neighbor_id)
    .single()
  if (fetchError || !neighbor) {
    return Response.json({ _error: 'neighbor_request_not_found', traceId }, { status: 500 })
  }
  if (neighbor.status !== 'pending') {
    return Response.json({ _error: 'not_pending', traceId }, { status: 500 })
  }

  // 수신자(house_b) 소유 검증 — 신청 보낸 쪽은 수락 불가
  const { data: houseB } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', neighbor.house_b_id)
    .eq('owner_key', owner_key)
    .single()
  if (!houseB) {
    return Response.json({ _error: 'not_recipient_owner', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_neighbors')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', neighbor_id)
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

// 제거 — reject / cancel / 해지 전부 이 하나로 통합 (요청자·수신자 누구든 가능)
const handleNeighborRemove = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const neighbor_id = searchParams.get('neighbor_id')
  const owner_key = searchParams.get('owner_key')

  if (!neighbor_id || !owner_key) {
    return Response.json({ _error: 'neighbor_id_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: neighbor, error: fetchError } = await supabase
    .from('corenull_neighbors')
    .select('house_a_id, house_b_id')
    .eq('id', neighbor_id)
    .single()
  if (fetchError || !neighbor) {
    return Response.json({ _error: 'neighbor_request_not_found', traceId }, { status: 500 })
  }

  const { data: ownedHouse } = await supabase
    .from('corenull_houses')
    .select('id')
    .in('id', [neighbor.house_a_id, neighbor.house_b_id])
    .eq('owner_key', owner_key)
    .single()
  if (!ownedHouse) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
  }

  const { error } = await supabase
    .from('corenull_neighbors')
    .delete()
    .eq('id', neighbor_id)

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data: { deleted: true }, traceId })
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE }