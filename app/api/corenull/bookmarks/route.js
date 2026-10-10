// CoreNull - Bookmarks API (관심 기능)
// corenull_bookmarks 테이블명 유지
// UI: "관심" / 동작: active | ended (soft)
// ended_at IS NULL → 관심중 / ended_at IS NOT NULL → 관심종료
export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET')   return handleGet(req, traceId)
  if (req.method === 'POST')  return handlePost(req, traceId)
  if (req.method === 'PATCH') return handlePatch(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { resolveActor } = await import('@/lib/actor')
  const actor = resolveActor(req)
  const { searchParams } = new URL(req.url)
  // actor 우선. query owner_key는 actor와 같을 때만 허용 (타인 서재 조회 차단)
  const q = searchParams.get('owner_key')
  const owner_key = actor?.ownerKey || q
  if (!owner_key) {
    return Response.json({ _error: 'actor_required', traceId }, { status: 401 })
  }
  if (actor && q && q !== actor.ownerKey) {
    return Response.json({ _error: 'actor_mismatch', traceId }, { status: 403 })
  }
  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('corenull_bookmarks')
    .select(`
      *,
      corenull_rooms(id, room_name, visibility),
      messages(id, type, content, meta)
    `)
    .eq('owner_key', owner_key)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const { requireActor, assertOwnerMatchesActor } = await import('@/lib/actor')
  const gate = requireActor(req, traceId)
  if (gate.error) return gate.error

  const body = JSON.parse(await req.text())
  const { room_id, message_id } = body
  const mismatch = assertOwnerMatchesActor(body.owner_key, gate.actor, traceId)
  if (mismatch) return mismatch
  const owner_key = gate.actor.ownerKey

  if (!room_id && !message_id) {
    return Response.json({ _error: 'room_id_or_message_id_required', traceId }, { status: 500 })
  }
  if (room_id && message_id) {
    return Response.json({ _error: 'only_one_target_allowed', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const query = supabase
    .from('corenull_bookmarks')
    .select('id, ended_at')
    .eq('owner_key', owner_key)

  if (room_id) query.eq('room_id', room_id)
  if (message_id) query.eq('message_id', message_id)

  const { data: existing } = await query.single()

  if (existing) {
    const { data, error } = await supabase
      .from('corenull_bookmarks')
      .update({ ended_at: null })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  const { data, error } = await supabase
    .from('corenull_bookmarks')
    .insert({ owner_key, room_id: room_id || null, message_id: message_id || null, ended_at: null })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const { requireActor, assertOwnerMatchesActor } = await import('@/lib/actor')
  const gate = requireActor(req, traceId)
  if (gate.error) return gate.error

  const body = JSON.parse(await req.text())
  const { id, action } = body
  const mismatch = assertOwnerMatchesActor(body.owner_key, gate.actor, traceId)
  if (mismatch) return mismatch
  const owner_key = gate.actor.ownerKey

  if (!id || !action) {
    return Response.json({ _error: 'id_action_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const ended_at = action === 'end' ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from('corenull_bookmarks')
    .update({ ended_at })
    .eq('id', id)
    .eq('owner_key', owner_key)
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST, handler as PATCH }
