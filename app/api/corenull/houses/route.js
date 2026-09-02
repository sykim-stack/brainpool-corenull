// CoreNull - House API
// 집 생성 / 조회
//
// NOTE(2026-08-31): owner_key 목록 조회 시 각 room에 lib/roomStage.js의
// attachRoomStages로 .stage(RoomStage 계약: seed_started_at/
// seed_target_date/participants_preview/harvested)를 붙여서 내려준다.
// 새 stage 계산 로직을 페이지마다 중복해서 짜지 않기 위함 — 이미 있는
// Adapter를 그대로 재사용한다. 화면(예: living/page.tsx)은 이 .stage를
// computeStage()에 넣어 배지/필터에 쓴다.

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

  // 모든 house의 room을 한 번에 모아서 배치로 stage 계산 (N+1 방지) —
  // attachRoomStages 자체가 이미 이 패턴으로 설계돼 있음.
  const { attachRoomStages } = await import('@/lib/roomStage')
  const allRooms = (data || []).flatMap(h => h.corenull_rooms || [])
  const stagedRooms = await attachRoomStages(supabase, allRooms)
  const stageById = new Map(stagedRooms.map(r => [r.id, r.stage]))

  const housesWithStage = (data || []).map(h => ({
    ...h,
    corenull_rooms: (h.corenull_rooms || []).map(r => ({ ...r, stage: stageById.get(r.id) || null })),
  }))

  return Response.json({ data: housesWithStage, traceId })
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