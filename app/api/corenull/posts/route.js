// CoreNull - Post API
// 포스트 작성 / 조회 (Message type=post|event)
// 작성 시 Footprint 자동 기록
// 작성 권한: 집주인 또는 house_member만 가능

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const room_id = searchParams.get('room_id')
  const post_id = searchParams.get('post_id')
  const owner_key = searchParams.get('owner_key')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // post_id 단건 조회
  if (post_id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', post_id)
      .single()

    if (error || !data) return Response.json({ _error: 'post_not_found', traceId }, { status: 500 })

    return Response.json({ data, traceId })
  }

  if (!room_id) {
    return Response.json({ _error: 'room_id_or_post_id_required', traceId }, { status: 500 })
  }

  // 방문 시 Footprint 자동 기록
  if (owner_key) {
    await supabase
      .from('corenull_footprints')
      .insert({ owner_key, room_id })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', room_id)
    .in('type', ['post', 'seed'])
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, content, meta, type } = body

  if (!room_id || !owner_key || !content) {
    return Response.json({ _error: 'room_id_owner_key_content_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 방 → 집 정보 조회
  const { data: room, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('house_id')
    .eq('id', room_id)
    .single()

  if (roomError || !room) {
    return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
  }

  const house_id = room.house_id

  // 집주인 확인
  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()

  const isOwner = house?.owner_key === owner_key

  // 멤버 확인
  let isMember = false
  if (!isOwner) {
    const { data: member } = await supabase
      .from('corenull_house_members')
      .select('device_id')
      .eq('house_id', house_id)
      .eq('device_id', owner_key)
      .single()

    isMember = !!member
  }

  if (!isOwner && !isMember) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
  }

  // 포스트 작성
  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id,
      type: type || 'post',
      content,
      meta: meta || {},
      relations: {},
    })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST }