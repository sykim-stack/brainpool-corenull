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
  const { searchParams } = new URL(req.url)
  const owner_key = searchParams.get('owner_key')
  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
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
  const body = JSON.parse(await req.text())
  const { owner_key, room_id, message_id } = body

  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
  }
  if (!room_id && !message_id) {
    return Response.json({ _error: 'room_id_or_message_id_required', traceId }, { status: 500 })
  }
  if (room_id && message_id) {
    return Response.json({ _error: 'only_one_target_allowed', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 기존 관심 확인 (ended 포함)
  const query = supabase
    .from('corenull_bookmarks')
    .select('id, ended_at')
    .eq('owner_key', owner_key)

  if (room_id) query.eq('room_id', room_id)
  if (message_id) query.eq('message_id', message_id)

  const { data: existing } = await query.single()

  if (existing) {
    // 이미 있으면 → 관심중으로 복구
    const { data, error } = await supabase
      .from('corenull_bookmarks')
      .update({ ended_at: null })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  // 새로 생성
  const { data, error } = await supabase
    .from('corenull_bookmarks')
    .insert({ owner_key, room_id: room_id || null, message_id: message_id || null, ended_at: null })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { id, owner_key, action } = body

  if (!id || !owner_key || !action) {
    return Response.json({ _error: 'id_owner_key_action_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // action: 'end' → 관심종료 / 'resume' → 관심중 복구
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