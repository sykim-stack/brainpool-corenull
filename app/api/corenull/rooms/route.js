export const dynamic = 'force-dynamic'

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
      .select('*, corenull_houses(id, title, primary_language, owner_key)')
      .eq('id', room_id)
      .single()
    if (error || !data) return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
    const { corenull_houses, ...room } = data
    const house = corenull_houses
      ? {
          id: corenull_houses.id,
          title: corenull_houses.title,
          primary_language: corenull_houses.primary_language,
          owner_key: corenull_houses.owner_key,
        }
      : null
    return Response.json({ room, house, traceId })
  }

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
    const { attachRoomStages, attachLatestMessages } = await import('@/lib/roomStage')
    const withStage = await attachRoomStages(supabase, rooms)
    const withLatest = await attachLatestMessages(supabase, withStage)
    return Response.json({ data: withLatest, traceId })
  }

  if (scope === 'writable') {
    const owner_key = searchParams.get('owner_key')
    if (!owner_key) return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
    const device_id = searchParams.get('device_id')
    const memberKeys = [owner_key, device_id].filter(Boolean)

    const { data: ownHouses, error: hErr } = await supabase
      .from('corenull_houses')
      .select('id, title')
      .eq('owner_key', owner_key)
    if (hErr) return Response.json({ _error: hErr.message, traceId }, { status: 500 })
    const ownHouseIds = (ownHouses || []).map((h) => h.id)
    const titleByHouse = Object.fromEntries((ownHouses || []).map((h) => [h.id, h.title]))

    const ownRooms = []
    if (ownHouseIds.length > 0) {
      const { data, error } = await supabase
        .from('corenull_rooms')
        .select('*')
        .in('house_id', ownHouseIds)
        .order('created_at', { ascending: true })
      if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
      for (const rm of data || []) {
        ownRooms.push({ ...rm, _source: 'owner', _house_title: titleByHouse[rm.house_id] || null })
      }
    }

    const { data: memberships, error: mErr } = await supabase
      .from('corenull_house_members')
      .select('house_id, room_id')
      .in('device_id', memberKeys)
    if (mErr) return Response.json({ _error: mErr.message, traceId }, { status: 500 })
    const memberRows = memberships || []
    const scopedRoomIds = [...new Set(memberRows.filter((m) => m.room_id).map((m) => m.room_id))]
    const houseWideIds = [...new Set(memberRows.filter((m) => !m.room_id && !ownHouseIds.includes(m.house_id)).map((m) => m.house_id))]

    const partRooms = []
    if (scopedRoomIds.length > 0) {
      const { data, error } = await supabase.from('corenull_rooms').select('*, corenull_houses(id, title)').in('id', scopedRoomIds)
      if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
      for (const rm of data || []) {
        partRooms.push({ ...rm, _source: 'member', _house_title: rm.corenull_houses?.title || null })
      }
    }
    if (houseWideIds.length > 0) {
      const { data, error } = await supabase.from('corenull_rooms').select('*, corenull_houses(id, title)').in('house_id', houseWideIds).order('created_at', { ascending: true })
      if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
      for (const rm of data || []) {
        partRooms.push({ ...rm, _source: 'member', _house_title: rm.corenull_houses?.title || null })
      }
    }

    const seen = new Set()
    const merged = []
    for (const rm of [...ownRooms, ...partRooms]) {
      if (seen.has(rm.id)) continue
      seen.add(rm.id)
      merged.push(rm)
    }
    return Response.json({ data: merged, traceId })
  }

  if (!house_id) return Response.json({ _error: 'house_id_or_room_id_or_scope_required', traceId }, { status: 500 })
  const { data, error } = await supabase.from('corenull_rooms').select('*').eq('house_id', house_id).order('created_at', { ascending: true })
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data: data || [], traceId })
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

  const { data: house, error: houseError } = await supabase.from('corenull_houses').select('id').eq('id', house_id).eq('owner_key', owner_key).single()
  if (houseError || !house) return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })

  // 방 생성 시 임시 배경 (복도 샘플 순환) — 이후 방 화면에서 바로 교체
  const DEFAULT_COVERS = [
    '/alley/corridor-01.jpg',
    '/alley/corridor-02.jpg',
    '/alley/corridor-03.jpg',
    '/alley/corridor-04.jpg',
    '/alley/corridor-05.jpg',
  ]
  const coverPick = DEFAULT_COVERS[Math.floor(Math.random() * DEFAULT_COVERS.length)]

  const { data, error } = await supabase.from('corenull_rooms').insert({
    house_id, room_name,
    room_type: room_type || 'general',
    visibility: visibility || 'private',
    seed_mode: !!seed_mode,
    bloom_date: bloom_date || null,
    slug: slug || null,
    cover_image_url: coverPick,
  }).select().single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  if (data?.seed_mode) {
    const { enqueueFact } = await import('@/lib/corehubOutbox')
    await enqueueFact(supabase, {
      fact_type: 'space.seed.created',
      owner_key,
      idempotency_key: `corenull:space.seed.created:room:${data.id}:v1`,
      payload: {
        room_id: data.id,
        house_id,
        bloom_date: data.bloom_date || null,
      },
    })
  }
  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, room_name, visibility, seed_mode, bloom_date, cover_image_url, cover_image_position } = body
  if (!room_id || !owner_key) return Response.json({ _error: 'room_id_and_owner_key_required', traceId }, { status: 500 })
  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: room, error: roomError } = await supabase.from('corenull_rooms').select('house_id').eq('id', room_id).single()
  if (roomError || !room) return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
  const { data: house, error: houseError } = await supabase.from('corenull_houses').select('id').eq('id', room.house_id).eq('owner_key', owner_key).single()
  if (houseError || !house) return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })

  const update = {}
  if (room_name !== undefined) update.room_name = room_name
  if (visibility !== undefined) update.visibility = visibility
  if (seed_mode !== undefined) update.seed_mode = !!seed_mode
  if (bloom_date !== undefined) update.bloom_date = bloom_date
  if (cover_image_url !== undefined) update.cover_image_url = cover_image_url
  if (cover_image_position !== undefined) update.cover_image_position = cover_image_position

  const { data, error } = await supabase.from('corenull_rooms').update(update).eq('id', room_id).select().single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export const GET = handler
export const POST = handler
export const PATCH = handler
