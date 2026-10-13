// CoreNull - Invite API
// POST → 토큰 생성 (집주인만, Actor 필수)
// GET  → 토큰 검증
// PATCH → 토큰 사용 (멤버 등록 — 토큰 자체가 권한)

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'POST')  return handlePost(req, traceId)
  if (req.method === 'GET')   return handleGet(req, traceId)
  if (req.method === 'PATCH') return handlePatch(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handlePost = async (req, traceId) => {
  const { requireActor, assertOwnerMatchesActor } = await import('@/lib/actor')
  const gate = requireActor(req, traceId)
  if (gate.error) return gate.error

  const body = JSON.parse(await req.text())
  const { house_id, room_id } = body
  const mismatch = assertOwnerMatchesActor(body.owner_key, gate.actor, traceId)
  if (mismatch) return mismatch
  const owner_key = gate.actor.ownerKey

  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key, title')
    .eq('id', house_id)
    .single()

  if (house?.owner_key !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  let roomName = null
  if (room_id) {
    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('id, room_name, house_id')
      .eq('id', room_id)
      .single()
    if (!room || room.house_id !== house_id) {
      return Response.json({ _error: 'room_not_in_house', traceId }, { status: 500 })
    }
    roomName = room.room_name
  }

  const token = crypto.randomUUID().replace(/-/g, '')
  const expired_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('corenull_invite_tokens')
    .insert({ invite_token: token, house_id, room_id: room_id || null, created_by: owner_key, expired_at })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data: { ...data, house_title: house.title, room_name: roomName }, traceId })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return Response.json({ _error: 'token_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('corenull_invite_tokens')
    .select('*, corenull_houses(id, title, primary_language), corenull_rooms(id, room_name)')
    .eq('invite_token', token)
    .single()

  if (error || !data) return Response.json({ _error: 'invalid_token', traceId }, { status: 500 })

  if (new Date(data.expired_at) < new Date()) {
    return Response.json({ _error: 'token_expired', traceId }, { status: 500 })
  }

  if (data.used_at) {
    return Response.json({ _error: 'token_already_used', traceId }, { status: 500 })
  }

  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { token, device_id } = body

  if (!token || !device_id) {
    return Response.json({ _error: 'token_device_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: tokenData, error: tokenError } = await supabase
    .from('corenull_invite_tokens')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (tokenError || !tokenData) {
    return Response.json({ _error: 'invalid_token', traceId }, { status: 500 })
  }

  if (new Date(tokenData.expired_at) < new Date()) {
    return Response.json({ _error: 'token_expired', traceId }, { status: 500 })
  }

  if (tokenData.used_at) {
    return Response.json({ _error: 'token_already_used', traceId }, { status: 500 })
  }

  if (tokenData.created_by === device_id) {
    return Response.json({ _error: 'owner_cannot_join', traceId }, { status: 500 })
  }

  const membershipQuery = supabase
    .from('corenull_house_members')
    .select('device_id, room_id')
    .eq('house_id', tokenData.house_id)
    .eq('device_id', device_id)

  const { data: existingRows } = await membershipQuery
  const alreadyScoped = (existingRows || []).some(
    (m) => m.room_id === (tokenData.room_id || null)
  )

  if (!alreadyScoped) {
    await supabase
      .from('corenull_house_members')
      .insert({ house_id: tokenData.house_id, device_id, room_id: tokenData.room_id || null })
  }

  await supabase
    .from('corenull_invite_tokens')
    .update({ used_at: new Date().toISOString(), used_by: device_id })
    .eq('invite_token', token)

  return Response.json({ data: { house_id: tokenData.house_id, room_id: tokenData.room_id || null }, traceId })
}

export { handler as GET, handler as POST, handler as PATCH }
