export const dynamic = 'force-dynamic'

/**
 * Durable outbox enqueue (existing corenull_message_outbox schema).
 * Message write 성공 후 호출. 실패해도 message 응답은 유지 (fail-soft).
 * Worker가 pending → CoreHub facts 로 전송.
 */
const enqueueMessageOutbox = async (supabase, {
  messageId,
  ownerKey,
  factType,
  roomId,
  houseId,
  messageType,
  content,
  meta,
  relations,
  language,
  traceId,
}) => {
  const idempotency_key = `corenull:messages:${messageId}:v1`
  const payload = {
    message_id: messageId,
    house_id: houseId || null,
    room_id: roomId || null,
    type: messageType,
    content,
    meta: meta || {},
    relations: relations || {},
    language: language || null,
    owner_key: ownerKey,
  }
  const { error } = await supabase.from('corenull_message_outbox').insert({
    message_id: messageId,
    owner_key: ownerKey,
    fact_type: factType,
    payload,
    idempotency_key,
    status: 'pending',
    attempts: 0,
    next_attempt_at: new Date().toISOString(),
  })
  if (error) {
    console.error('[outbox] enqueue failed', error.message, { idempotency_key, traceId })
  }
}

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  if (req.method === 'PATCH') return handlePatch(req, traceId)
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

  if (post_id) {
    const { data, error } = await supabase.from('messages').select('*').eq('id', post_id).single()
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
    await supabase.from('corenull_footprints').insert({ owner_key, room_id })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', room_id)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  const rows = (data || []).slice().sort((a, b) => {
    const pa = a.meta?.pinned ? 1 : 0
    const pb = b.meta?.pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    const ta = a.meta?.pinned_at || a.created_at
    const tb = b.meta?.pinned_at || b.created_at
    if (pa && pb) return new Date(tb).getTime() - new Date(ta).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  return Response.json({ data: rows, traceId })
}

const canWriteRoom = async (supabase, room_id, owner_key) => {
  const { data: room, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('id, house_id, seed_mode, bloom_date, room_name')
    .eq('id', room_id)
    .single()
  if (roomError || !room) return { ok: false, error: 'room_not_found' }

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key, primary_language')
    .eq('id', room.house_id)
    .single()

  const isOwner = house?.owner_key === owner_key
  let isMember = false
  if (!isOwner) {
    const { data: members } = await supabase
      .from('corenull_house_members')
      .select('device_id, room_id')
      .eq('house_id', room.house_id)
      .eq('device_id', owner_key)
    isMember = (members || []).some((m) => m.room_id === null || m.room_id === room_id)
  }

  if (!isOwner && !isMember) return { ok: false, error: 'not_authorized' }
  return {
    ok: true,
    house_id: room.house_id,
    primary_language: house?.primary_language || 'ko',
    room,
    isOwner,
  }
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, content, meta, type, relations, seed_start, seed_end_date, pin } = body

  if (!room_id || !owner_key || !content) {
    return Response.json({ _error: 'room_id_owner_key_content_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const messageType = type || 'post'
  let insertMeta = meta || {}

  if (messageType === 'comment') {
    const insertPayload = {
      room_id,
      owner_key,
      type: messageType,
      content,
      meta: insertMeta,
      relations: relations || {},
    }
    const { data, error } = await supabase.from('messages').insert(insertPayload).select().single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  const auth = await canWriteRoom(supabase, room_id, owner_key)
  if (!auth.ok) return Response.json({ _error: auth.error, traceId }, { status: 500 })

  if (pin) {
    if (!auth.isOwner) {
      return Response.json({ _error: 'only_owner_can_pin', traceId }, { status: 403 })
    }
    insertMeta = {
      ...insertMeta,
      pinned: true,
      pinned_at: new Date().toISOString(),
    }
  }

  if (seed_start) {
    if (!auth.isOwner) {
      return Response.json({ _error: 'not_authorized', traceId }, { status: 403 })
    }
    if (!seed_end_date) {
      return Response.json({ _error: 'seed_end_date_required', traceId }, { status: 400 })
    }
  }

  if (!seed_start && auth.room?.seed_mode) {
    const {
      getOpenSeedPage,
      buildSeedMeta,
      isSeedEndPassed,
      finalizeSeedIfDue,
    } = await import('@/lib/seedPeriod')
    const page = await getOpenSeedPage(supabase, room_id)
    if (page?.end_date && isSeedEndPassed(page.end_date)) {
      await finalizeSeedIfDue(supabase, {
        ...auth.room,
        bloom_date: page.end_date || auth.room.bloom_date,
      })
    } else if (page?.run_id) {
      insertMeta = {
        ...insertMeta,
        seed: buildSeedMeta({
          role: 'member',
          endDate: page.end_date || auth.room.bloom_date,
          runId: page.run_id,
        }),
      }
    }
  }

  const sourceLang = auth.primary_language || 'ko'
  const insertPayload = {
    room_id,
    owner_key,
    type: messageType,
    content,
    meta: insertMeta,
    relations: relations || {},
    house_id: auth.house_id,
    language: sourceLang,
    translated_ko: null,
    translation_status: sourceLang === 'ko' ? 'completed' : 'pending',
  }

  const { data, error } = await supabase.from('messages').insert(insertPayload).select().single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  // Stage A: 상위 글 outbox (comment 제외). CoreHub 전송은 worker.
  if (messageType === 'post' || messageType === 'fruit') {
    await enqueueMessageOutbox(supabase, {
      messageId: data.id,
      ownerKey: owner_key,
      factType: 'space.message.created',
      roomId: room_id,
      houseId: auth.house_id,
      messageType,
      content: data.content,
      meta: data.meta,
      relations: data.relations,
      language: data.language,
      traceId,
    })
  }

  let seedPage = null
  if (seed_start) {
    const { startSeedRun } = await import('@/lib/seedPeriod')
    const started = await startSeedRun(supabase, {
      roomId: room_id,
      houseId: auth.house_id,
      ownerKey: owner_key,
      startPostId: data.id,
      endDate: seed_end_date,
      title: auth.room?.room_name || null,
      memo: '',
    })
    if (started.error) {
      return Response.json(
        {
          data,
          seed_error: started.error.message || String(started.error),
          traceId,
        },
        { status: 200 }
      )
    }
    seedPage = started.page
    await supabase
      .from('messages')
      .update({
        meta: {
          ...(data.meta || {}),
          seed: {
            role: 'start',
            run_id: seedPage.run_id,
            end_date: seedPage.end_date,
            phase: 'growing',
            started_at: data.created_at,
          },
        },
      })
      .eq('id', data.id)
    // space.seed.created 는 startSeedRun 내부 enqueueFact 가 담당
  }

  if (messageType === 'fruit') {
    const { enqueueFact } = await import('@/lib/corehubOutbox')
    await enqueueFact(supabase, {
      fact_type: 'space.fruit.created',
      owner_key,
      message_id: data.id,
      idempotency_key: `corenull:space.fruit.created:message:${data.id}:v1`,
      payload: {
        post_id: data.id,
        room_id,
        house_id: auth.house_id || null,
        parent_id: relations?.parent_id || null,
      },
    })
  }

  return Response.json({
    data,
    seed_page: seedPage
      ? { slug: seedPage.slug, share_path: `/s/${seedPage.slug}`, end_date: seedPage.end_date }
      : null,
    traceId,
  })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { post_id, owner_key, action, content, meta, room_id } = body

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

  if (action === 'pin' || action === 'unpin') {
    const auth = await canWriteRoom(supabase, original.room_id, owner_key)
    if (!auth.ok || !auth.isOwner) {
      return Response.json({ _error: 'not_authorized', traceId }, { status: 403 })
    }
    if (original.type !== 'post') {
      return Response.json({ _error: 'only_post_can_pin', traceId }, { status: 400 })
    }
    const nextMeta = { ...(original.meta || {}) }
    if (action === 'pin') {
      nextMeta.pinned = true
      nextMeta.pinned_at = new Date().toISOString()
    } else {
      delete nextMeta.pinned
      delete nextMeta.pinned_at
    }
    const { data, error } = await supabase
      .from('messages')
      .update({ meta: nextMeta })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (original.owner_key !== owner_key) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
  }

  if (action === 'edit') {
    if (!content) {
      return Response.json({ _error: 'content_required', traceId }, { status: 500 })
    }
    const updatePayload = {
      content,
      meta: meta ? { ...(original.meta || {}), ...meta } : original.meta,
    }
    if (room_id && room_id !== original.room_id) {
      const auth = await canWriteRoom(supabase, room_id, owner_key)
      if (!auth.ok) return Response.json({ _error: auth.error, traceId }, { status: 500 })
      updatePayload.room_id = room_id
      updatePayload.house_id = auth.house_id
    }
    const { data, error } = await supabase
      .from('messages')
      .update(updatePayload)
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (action === 'delete') {
    const { data, error } = await supabase
      .from('messages')
      .update({ meta: { ...(original.meta || {}), deleted: true } })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
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

    const { enqueueFact } = await import('@/lib/corehubOutbox')
    await enqueueFact(supabase, {
      fact_type: 'space.fruit.harvested',
      owner_key,
      message_id: post_id,
      idempotency_key: `corenull:space.fruit.harvested:message:${post_id}:v1`,
      payload: {
        post_id,
        room_id: original.room_id,
        house_id: original.house_id || null,
        harvested_at: data.harvested_at,
      },
    })

    return Response.json({ data, traceId })
  }

  return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
}

export { handler as GET, handler as POST, handler as PATCH }
