// CoreNull - House API
// 집 생성 / 조회

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const owner_key = searchParams.get('owner_key')
  const house_id = searchParams.get('house_id')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // house_id 단건 조회
  if (house_id) {
    const { data, error } = await supabase
      .from('corenull_houses')
      .select('*')
      .eq('id', house_id)
      .single()

    if (error || !data) return Response.json({ _error: 'house_not_found', traceId }, { status: 500 })

    return Response.json({ house: data, traceId })
  }

  // owner_key 목록 조회
  if (!owner_key) {
    return Response.json({ _error: 'owner_key_or_house_id_required', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_houses')
    .select('*, corenull_rooms(*)')
    .eq('owner_key', owner_key)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { owner_key, title, description, slug, primary_language } = body

  if (!owner_key || !title) {
    return Response.json({ _error: 'owner_key_and_title_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 집 생성
  const { data: house, error } = await supabase
    .from('corenull_houses')
    .insert({ owner_key, title, description, slug: slug || null, primary_language: primary_language || 'ko' })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  // 기본 방 "일상" 자동 생성
  await supabase
    .from('corenull_rooms')
    .insert({
      house_id: house.id,
      room_name: '일상',
      room_type: 'normal',
      visibility: 'public',
      seed_mode: false,
    })

  return Response.json({ data: house, traceId })
}

export { handler as GET, handler as POST }