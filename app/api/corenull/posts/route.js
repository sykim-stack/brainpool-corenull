// CoreNull - Posts/Comments API
// Message type: post | comment | fruit
// GET ?post_id=    → 단건 조회
// GET ?room_id=    → 방 포스트 목록
// GET ?parent_id=  → 댓글 목록
// POST             → 작성 (type 파라미터로 구분)

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
  const parent_id = searchParams.get('parent_id')
  const owner_key = searchParams.get('owner_key')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 단건 조회
  if (post_id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', post_id)
      .single()

    if (error || !data) return Response.json({ _error: 'post_not_found', traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  // 댓글 목록
  if (parent_id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('type', 'comment')
      .contains('relations', { parent_id })
      .order('created_at', { ascending: true })

    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (!room_id) {
    return Response.json({ _error: 'room_id_or_post_id_or_parent_id_required', traceId }, { status: 500 })
  }

  // 방문 시 Footprint 자동 기록
  if (owner_key) {
    await supabase
      .from('corenull_footprints')
      .insert({ owner_key, room_id })
  }

  // 방 포스트 목록
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', room_id)
    .in('type', ['post', 'seed', 'fruit'])
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, content, meta, type, relations } = body

  if (!room_id || !owner_key || !content) {
    return Response.json({ _error: 'room_id_owner_key_content_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const messageType = type || 'post'

  // comment는 권한 체크 없이 작성 가능 (방문자도 댓글 가능)
  if (messageType !== 'comment') {
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
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id,
      owner_key,
      type: messageType,
      content,
      meta: meta || {},
      relations: relations || {},
    })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST }