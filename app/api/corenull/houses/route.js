// CoreNull - House API
// 집 생성 / 조회 / 수정
// 1인 1집 원칙: owner_key당 house는 반드시 1개 (DB unique 제약 + API idempotent 처리)

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  if (req.method === 'PATCH') return handlePatch(req, traceId)

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

  // owner_key 목록 조회 — 1인 1집이므로 배열이지만 항상 0~1개
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

  // 1인 1집: 이미 집이 있으면 새로 만들지 않고 기존 집을 그대로 반환 (idempotent)
  const { data: existingHouse } = await supabase
    .from('corenull_houses')
    .select('*')
    .eq('owner_key', owner_key)
    .maybeSingle()

  if (existingHouse) {
    return Response.json({ data: existingHouse, already_existed: true, traceId })
  }

  // 집 생성
  const { data: house, error } = await supabase
    .from('corenull_houses')
    .insert({ owner_key, title, description, slug: slug || null, primary_language: primary_language || 'ko' })
    .select()
    .single()

  if (error) {
    // DB unique 제약(owner_key)에 걸린 경우 — 동시 요청 등으로 레이스가 났을 때의 안전망
    if (error.code === '23505') {
      const { data: raceHouse } = await supabase
        .from('corenull_houses')
        .select('*')
        .eq('owner_key', owner_key)
        .single()
      if (raceHouse) return Response.json({ data: raceHouse, already_existed: true, traceId })
    }
    return Response.json({ _error: error.message, traceId }, { status: 500 })
  }

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

// 집 정보 수정 (owner만) — 지금은 히어로 배경 지정 용도
const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, owner_key, hero_image_url } = body

  if (!house_id || !owner_key) {
    return Response.json({ _error: 'house_id_and_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: house, error: fetchError } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()
  if (fetchError || !house) {
    return Response.json({ _error: 'house_not_found', traceId }, { status: 500 })
  }
  if (house.owner_key !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  // 지금은 hero_image_url만 수정 가능 (별도 업로드 폼 없이, 기존 Post 미디어 URL을 그대로 지정)
  const updatePayload = {}
  if (hero_image_url !== undefined) updatePayload.hero_image_url = hero_image_url || null

  if (Object.keys(updatePayload).length === 0) {
    return Response.json({ _error: 'nothing_to_update', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_houses')
    .update(updatePayload)
    .eq('id', house_id)
    .select()
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST, handler as PATCH }