// CoreNull - Posts API
// Message type: post | comment | fruit
// GET  ?post_id=   → 단건 조회
// GET  ?room_id=   → 방 포스트 목록
// GET  ?parent_id= → 댓글 목록
// POST             → 작성 (type 파라미터로 구분)
// PATCH            → 상태 변경 (action: archive | rebirth | harvest)

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
  const room_id   = searchParams.get('room_id')
  const post_id   = searchParams.get('post_id')
  const parent_id = searchParams.get('parent_id')
  const owner_key = searchParams.get('owner_key')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  if (post_id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', post_id)
      .single()
    if (error || !data) return Response.json({ _error: 'post_not_found', traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (parent_id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('type', ['comment', 'fruit'])
      .contains('relations', { parent_id })
      .order('created_at', { ascending: true })
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (!room_id) {
    return Response.json({ _error: 'room_id_or_post_id_or_parent_id_required', traceId }, { status: 500 })
  }

  if (owner_key) {
    await supabase
      .from('corenull_footprints')
      .insert({ owner_key, room_id })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', room_id)
    .in('type', ['post', 'fruit'])
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
  const insertPayload = {
    room_id,
    owner_key,
    type: messageType,
    content,
    meta: meta || {},
    relations: relations || {},
  }

  if (messageType !== 'comment') {
    const { data: room, error: roomError } = await supabase
      .from('corenull_rooms')
      .select('house_id')
      .eq('id', room_id)
      .single()
    if (roomError || !room) {
      return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
    }

    const { data: house } = await supabase
      .from('corenull_houses')
      .select('owner_key, primary_language')
      .eq('id', room.house_id)
      .single()

    const isOwner = house?.owner_key === owner_key
    let isMember = false
    if (!isOwner) {
      const { data: member } = await supabase
        .from('corenull_house_members')
        .select('device_id')
        .eq('house_id', room.house_id)
        .eq('device_id', owner_key)
        .single()
      isMember = !!member
    }
    if (!isOwner && !isMember) {
      return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
    }

    const sourceLang = house?.primary_language || 'ko'
    insertPayload.language = sourceLang
    insertPayload.translated_ko = null
    insertPayload.translation_status = sourceLang === 'ko' ? 'completed' : 'pending'
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(insertPayload)
    .select()
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  const coreringUrl = process.env.CORERING_API_URL

  // CoreRing 번역 트리거 — pending 상태인 경우만, 비동기
  if (insertPayload.translation_status === 'pending' && coreringUrl) {
    fetch(`${coreringUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: data.id }),
    }).catch(() => {})
  }

  // CoreRing Push 알림 — 댓글 작성 시 원글 작성자에게 알림
  if (messageType === 'comment' && coreringUrl) {
    const parentId = relations?.parent_id
    if (parentId) {
      // 원글 작성자 조회
      const { data: parentPost } = await supabase
        .from('messages')
        .select('owner_key, content')
        .eq('id', parentId)
        .single()

      // 원글 작성자 ≠ 댓글 작성자인 경우만 알림
      if (parentPost?.owner_key && parentPost.owner_key !== owner_key) {
        fetch(`${coreringUrl}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parentPost.owner_key,
            title: '💬 새 댓글',
            body: content.slice(0, 50),
            url: `/posts/${parentId}`,
          }),
        }).catch(() => {})
      }
    }
  }

  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { post_id, owner_key, action, content, room_id } = body

  if (!post_id || !owner_key || !action) {
    return Response.json({ _error: 'post_id_owner_key_action_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: original, error: fetchError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', post_id)
    .single()
  if (fetchError || !original) {
    return Response.json({ _error: 'post_not_found', traceId }, { status: 500 })
  }

  if (original.owner_key !== owner_key) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
  }

  if (action === 'archive') {
    const { data, error } = await supabase
      .from('messages')
      .update({ meta: { ...(original.meta || {}), archived: true } })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (action === 'rebirth') {
    const newContent = content || original.content
    const sourceLang = original.language || 'ko'
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: room_id || original.room_id,
        owner_key,
        type: 'post',
        content: newContent,
        meta: {
          ...(original.meta || {}),
          archived: false,
          reborn_from: post_id,
          reborn_at: new Date().toISOString(),
        },
        relations: {},
        language: sourceLang,
        translated_ko: null,
        translation_status: sourceLang === 'ko' ? 'completed' : 'pending',
      })
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (action === 'harvest') {
    if (original.type !== 'fruit') {
      return Response.json({ _error: 'only_fruit_can_be_harvested', traceId }, { status: 500 })
    }
    if (original.harvested_at) {
      return Response.json({ _error: 'already_harvested', traceId }, { status: 500 })
    }
    const { data, error } = await supabase
      .from('messages')
      .update({ harvested_at: new Date().toISOString() })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
}

export { handler as GET, handler as POST, handler as PATCH }