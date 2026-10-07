// CoreNull - Members API
// 집/방 멤버 확인 / 추가 / 해지
//
// NOTE(2026-08-30): room_id 스코핑 + 양방향 해지 추가.
// NOTE(2026-10-06): device_id 컬럼 = Owner ID. 구 초대는 Device UUID일 수 있어
//   GET 시 owner_key를 함께 받아 합집합 조회한다.
// NOTE(2026-10-07): 목록 GET 시 house 프로필(title/avatar) enrich — 방 상단
//   만든사람·참여자 표시용. Creator는 members에 없고 House.owner_key다.

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  if (req.method === 'DELETE') return handleDelete(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const device_id = searchParams.get('device_id')
  const room_id = searchParams.get('room_id')

  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  if (device_id) {
    // device_id 파라미터에 Owner ID가 온다. 구 데이터 호환을 위해 owner_key도 받음
    const owner_key = searchParams.get('owner_key')
    const keys = [...new Set([device_id, owner_key].filter(Boolean))]
    const { data } = await supabase
      .from('corenull_house_members')
      .select('device_id, room_id')
      .eq('house_id', house_id)
      .in('device_id', keys)

    const rows = data || []
    const is_member = room_id
      ? rows.some(m => m.room_id === null || m.room_id === room_id)
      : rows.length > 0

    return Response.json({ is_member, rows, traceId })
  }

  let query = supabase
    .from('corenull_house_members')
    .select('*')
    .eq('house_id', house_id)
    .order('joined_at', { ascending: true })

  const { data, error } = await query
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  const filtered = room_id
    ? (data || []).filter(m => m.room_id === null || m.room_id === room_id)
    : (data || [])

  // 방 상단 참여자 표시용: device_id → house 프로필(title, avatar_url)
  // Owner 1 : House n 이므로 owner_key당 최신 집 1개를 붙인다.
  const keys = [...new Set(filtered.map((m) => m.device_id).filter(Boolean))]
  let houseByOwner = {}
  if (keys.length > 0) {
    const { data: houses } = await supabase
      .from('corenull_houses')
      .select('id, title, avatar_url, primary_language, owner_key, created_at')
      .in('owner_key', keys)
      .order('created_at', { ascending: false })

    for (const h of houses || []) {
      if (!houseByOwner[h.owner_key]) {
        houseByOwner[h.owner_key] = {
          id: h.id,
          title: h.title,
          avatar_url: h.avatar_url || null,
          primary_language: h.primary_language || 'ko',
        }
      }
    }
  }

  const enriched = filtered.map((m) => ({
    ...m,
    house: houseByOwner[m.device_id] || null,
  }))

  return Response.json({ data: enriched, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, owner_key, device_id, room_id } = body

  if (!house_id || !owner_key || !device_id) {
    return Response.json({ _error: 'house_id_owner_key_device_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()

  if (house?.owner_key !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  if (room_id) {
    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('id, house_id')
      .eq('id', room_id)
      .single()
    if (!room || room.house_id !== house_id) {
      return Response.json({ _error: 'room_not_in_house', traceId }, { status: 500 })
    }
  }

  const { data: existingRows } = await supabase
    .from('corenull_house_members')
    .select('device_id, room_id')
    .eq('house_id', house_id)
    .eq('device_id', device_id)

  const alreadyScoped = (existingRows || []).some(m => m.room_id === (room_id || null))
  if (alreadyScoped) {
    return Response.json({ _error: 'already_member', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_house_members')
    .insert({ house_id, device_id, room_id: room_id || null })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

const handleDelete = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const requester_key = searchParams.get('owner_key')
  const device_id = searchParams.get('device_id')
  const room_id = searchParams.get('room_id')

  if (!house_id || !requester_key || !device_id) {
    return Response.json({ _error: 'house_id_owner_key_device_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()

  const isHouseOwner = house?.owner_key === requester_key
  const isSelf = requester_key === device_id

  if (!isHouseOwner && !isSelf) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
  }

  let query = supabase
    .from('corenull_house_members')
    .delete()
    .eq('house_id', house_id)
    .eq('device_id', device_id)

  query = room_id ? query.eq('room_id', room_id) : query.is('room_id', null)

  const { error } = await query

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data: { deleted: true }, traceId })
}

export { handler as GET, handler as POST, handler as DELETE }
