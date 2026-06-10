// CoreNull - Room API
// 방 생성 / 조회 (집주인만 생성 가능)

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const room_id = searchParams.get('room_id')

  // room_id 단건 조회
  if (room_id) {
    const { getSupabase } = await import('@/lib/supabase')
    const supabase = getSupabase()
    if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

    const { data, error } = await supabase
      .from('corenull_rooms')
      .select('*')
      .eq('id', room_id)
      .single()

    if (error || !data) return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })

    return Response.json({ room: data, traceId })
  }

  // house_id 목록 조회
  if (!house_id) {
    return Response.json({ _error: 'house_id_or_room_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('corenull_rooms')
    .select('*')
    .eq('house_id', house_id)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, owner_key, room_name, room_type, visibility, event_mode, slug } = body

  if (!house_id || !owner_key || !room_name) {
    return Response.json({ _error: 'house_id_owner_key_room_name_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 집주인 검증 — 방은 집주인만 생성 가능
  const { data: house, error: houseError } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', house_id)
    .eq('owner_key', owner_key)
    .single()

  if (houseError || !house) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_rooms')
    .insert({
      house_id,
      room_name,
      room_type: room_type || 'normal',
      visibility: visibility || 'public',
      event_mode: event_mode || false,
      slug: slug || null,
    })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST }