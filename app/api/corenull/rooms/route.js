$content = @'
// CoreNull - Room API
// 방 생성 / 조회 / 수정 (집주인만 가능)
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
  const { house_id, owner_key, room_name, room_type, visibility, seed_mode, bloom_date, slug } = body

  if (!house_id || !owner_key || !room_name) {
    return Response.json({ _error: 'house_id_owner_key_room_name_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

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
      seed_mode: seed_mode || false,
      bloom_date: bloom_date || null,
      slug: slug || null,
    })
    .select()
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, room_name, visibility } = body

  if (!room_id || !owner_key) {
    return Response.json({ _error: 'room_id_and_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: room, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('house_id')
    .eq('id', room_id)
    .single()
  if (roomError || !room) return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })

  const { data: house, error: houseError } = await supabase
    .from('corenull_houses')
    .select('id')
    .eq('id', room.house_id)
    .eq('owner_key', owner_key)
    .single()
  if (houseError || !house) return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })

  const updatePayload = {}
  if (room_name) updatePayload.room_name = room_name
  if (visibility) updatePayload.visibility = visibility

  const { data, error } = await supabase
    .from('corenull_rooms')
    .update(updatePayload)
    .eq('id', room_id)
    .select()
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST, handler as PATCH }
'@
[System.IO.File]::WriteAllText("G:\brainpool-corenull\app\api\corenull\rooms\route.js", $content)