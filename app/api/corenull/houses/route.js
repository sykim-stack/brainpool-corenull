// CoreNull - House API
// action=neighbors|discover|neighbor-request|neighbor-accept|neighbor-remove
// [feat/house-images] PATCH images
// [마당] discover = 관계 없는 다른 집 (의미 추천 아님)

export const dynamic = 'force-dynamic'

const HOUSE_IMAGE_FIELDS = ['avatar_url', 'yard_image_url', 'living_image_url']
const HERO_POSITION_FIELDS = ['yard_image_position', 'living_image_position']

function normalizeHeroPosition(value) {
  const input = value && typeof value === 'object' ? value : {}
  const clamp = (n, min, max, fallback) => {
    const parsed = Number(n)
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
  }
  return {
    x: clamp(input.x, 0, 100, 50),
    y: clamp(input.y, 0, 100, 50),
    scale: clamp(input.scale, 1, 2.5, 1),
  }
}

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (req.method === 'GET') {
    if (action === 'neighbors') return handleNeighborsList(req, traceId)
    if (action === 'discover') return handleDiscover(req, traceId)
    return handleGet(req, traceId)
  }
  if (req.method === 'POST') {
    if (action === 'neighbor-request') return handleNeighborRequest(req, traceId)
    return handlePost(req, traceId)
  }
  if (req.method === 'PATCH') {
    if (action === 'neighbor-accept') return handleNeighborAccept(req, traceId)
    return handleHousePatch(req, traceId)
  }
  if (req.method === 'DELETE') {
    if (action === 'neighbor-remove') return handleNeighborRemove(req, traceId)
    return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
  }

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

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

  await supabase.from('corenull_rooms').insert({
    house_id: house.id,
    room_name: '일상',
    room_type: 'normal',
    visibility: 'public',
    seed_mode: false,
  })

  return Response.json({ data: house, traceId })
}

const handleHousePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, owner_key } = body

  if (!house_id || !owner_key) {
    return Response.json({ _error: 'house_id_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: owned } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', house_id)
    .eq('owner_key', owner_key)
    .single()

  if (!owned) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  const patch = {}
  for (const key of HOUSE_IMAGE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const v = body[key]
      patch[key] = v === '' || v === undefined ? null : v
    }
  }
  // 원본 이미지는 재생성하지 않고, Hero별 표시 설정만 저장한다.
  // 임의 필드는 받지 않으며 숫자 범위도 서버에서 한 번 더 제한한다.
  for (const key of HERO_POSITION_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      patch[key] = normalizeHeroPosition(body[key])
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'title') && body.title != null) {
    patch.title = String(body.title).trim() || null
  }
  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    patch.description = body.description === '' ? null : body.description
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ _error: 'no_fields_to_update', traceId }, { status: 500 })
  }

  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('corenull_houses')
    .update(patch)
    .eq('id', house_id)
    .eq('owner_key', owner_key)
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

// 마당 골목 발견: 의미 추천 아님. 나와 관계 없는 집만 표면으로.
const handleDiscover = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: rels } = await supabase
    .from('corenull_neighbors')
    .select('house_a_id, house_b_id')
    .or(`house_a_id.eq.${house_id},house_b_id.eq.${house_id}`)

  const exclude = new Set([house_id])
  for (const r of rels || []) {
    exclude.add(r.house_a_id)
    exclude.add(r.house_b_id)
  }

  const { data: houses, error } = await supabase
    .from('corenull_houses')
    .select('id, title, primary_language, avatar_url, yard_image_url, living_image_url, description, created_at')
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  const candidates = (houses || []).filter((h) => !exclude.has(h.id)).slice(0, 12)
  return Response.json({ data: candidates, traceId })
}

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

  const otherIds = (rows || []).map((r) => (r.house_a_id === house_id ? r.house_b_id : r.house_a_id))
  let housesMap = {}
  if (otherIds.length > 0) {
    const { data: houses } = await supabase
      .from('corenull_houses')
      .select('id, title, primary_language, avatar_url, yard_image_url, living_image_url')
      .in('id', otherIds)
    housesMap = Object.fromEntries((houses || []).map((h) => [h.id, h]))
  }

  const data = (rows || []).map((r) => {
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

  const { data: houseA } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', house_a_id)
    .eq('owner_key', owner_key)
    .single()
  if (!houseA) return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })

  const { data: houseB } = await supabase.from('corenull_houses').select('id').eq('id', house_b_id).single()
  if (!houseB) return Response.json({ _error: 'target_house_not_found', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('corenull_neighbors')
    .insert({ house_a_id, house_b_id, status: 'pending' })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ _error: 'already_requested_or_neighbors', traceId }, { status: 500 })
    }
    return Response.json({ _error: error.message, traceId }, { status: 500 })
  }

  return Response.json({ data, traceId })
}

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

  const { data: houseB } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', neighbor.house_b_id)
    .eq('owner_key', owner_key)
    .single()
  if (!houseB) return Response.json({ _error: 'not_recipient_owner', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('corenull_neighbors')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', neighbor_id)
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

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
  if (!ownedHouse) return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })

  const { error } = await supabase.from('corenull_neighbors').delete().eq('id', neighbor_id)
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data: { deleted: true }, traceId })
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE }
