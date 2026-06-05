// CoreNull - Bookmarks API
// 관심 저장 (수동) / 조회
// Interest = 수동 저장 / DB = corenull_bookmarks

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
      corenull_rooms(id, room_name, room_type, visibility, event_mode, slug),
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

  // room_id 또는 message_id 둘 중 하나만
  if (!room_id && !message_id) {
    return Response.json({ _error: 'room_id_or_message_id_required', traceId }, { status: 500 })
  }
  if (room_id && message_id) {
    return Response.json({ _error: 'only_one_target_allowed', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 중복 체크
  const query = supabase
    .from('corenull_bookmarks')
    .select('id')
    .eq('owner_key', owner_key)

  if (room_id) query.eq('room_id', room_id)
  if (message_id) query.eq('message_id', message_id)

  const { data: existing } = await query.single()
  if (existing) {
    return Response.json({ _error: 'already_bookmarked', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_bookmarks')
    .insert({ owner_key, room_id: room_id || null, message_id: message_id || null })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

const handleDelete = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const owner_key = searchParams.get('owner_key')

  if (!id || !owner_key) {
    return Response.json({ _error: 'id_and_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { error } = await supabase
    .from('corenull_bookmarks')
    .delete()
    .eq('id', id)
    .eq('owner_key', owner_key)

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data: { deleted: true }, traceId })
}

export { handler as GET, handler as POST, handler as DELETE }