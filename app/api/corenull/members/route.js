// CoreNull - Members API
// 집 멤버 확인 / 추가

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  if (req.method === 'DELETE') return handleDelete(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

// 멤버 확인
const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const device_id = searchParams.get('device_id')

  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 특정 멤버 확인
  if (device_id) {
    const { data } = await supabase
      .from('corenull_house_members')
      .select('device_id')
      .eq('house_id', house_id)
      .eq('device_id', device_id)
      .single()

    return Response.json({ is_member: !!data, traceId })
  }

  // 전체 멤버 목록
  const { data, error } = await supabase
    .from('corenull_house_members')
    .select('*')
    .eq('house_id', house_id)
    .order('joined_at', { ascending: true })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

// 멤버 추가 (집주인만 가능)
const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, owner_key, device_id } = body

  if (!house_id || !owner_key || !device_id) {
    return Response.json({ _error: 'house_id_owner_key_device_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 집주인 검증
  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()

  if (house?.owner_key !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  // 중복 확인
  const { data: existing } = await supabase
    .from('corenull_house_members')
    .select('device_id')
    .eq('house_id', house_id)
    .eq('device_id', device_id)
    .single()

  if (existing) {
    return Response.json({ _error: 'already_member', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_house_members')
    .insert({ house_id, device_id })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

// 멤버 제거 (집주인만 가능)
const handleDelete = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const owner_key = searchParams.get('owner_key')
  const device_id = searchParams.get('device_id')

  if (!house_id || !owner_key || !device_id) {
    return Response.json({ _error: 'house_id_owner_key_device_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 집주인 검증
  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()

  if (house?.owner_key !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  const { error } = await supabase
    .from('corenull_house_members')
    .delete()
    .eq('house_id', house_id)
    .eq('device_id', device_id)

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data: { deleted: true }, traceId })
}

export { handler as GET, handler as POST, handler as DELETE }