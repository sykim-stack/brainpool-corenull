// CoreNull - House Snapshots API
// ADR-001 기준 Derived Data
// Snapshot은 Message를 수정하지 않는다
// 언제든 재생성 가능, source_message_ids 반드시 보관
export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET')  return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

// 스냅샷 조회
const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const snapshot_type = searchParams.get('snapshot_type')

  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  let query = supabase
    .from('house_snapshots')
    .select('*')
    .eq('house_id', house_id)
    .order('derived_at', { ascending: false })

  if (snapshot_type) query = query.eq('snapshot_type', snapshot_type)

  const { data, error } = await query
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

// 스냅샷 생성
const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, snapshot_type, derived_by } = body

  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 1. house 확인
  const { data: house, error: houseError } = await supabase
    .from('corenull_houses')
    .select('id, title, primary_language, owner_key')
    .eq('id', house_id)
    .single()
  if (houseError || !house) {
    return Response.json({ _error: 'house_not_found', traceId }, { status: 500 })
  }

  // 2. 이 house의 모든 room 조회
  const { data: rooms, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('id, room_name, visibility, seed_mode, bloom_date')
    .eq('house_id', house_id)
  if (roomError) return Response.json({ _error: roomError.message, traceId }, { status: 500 })

  const roomIds = (rooms || []).map(r => r.id)

  // 3. 이 house의 모든 message 수집 (deleted 제외)
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, type, content, created_at, owner_key, room_id, harvested_at, language')
    .in('room_id', roomIds)
    .not('meta', 'cs', '{"deleted":true}')
    .order('created_at', { ascending: false })
  if (msgError) return Response.json({ _error: msgError.message, traceId }, { status: 500 })

  const source_message_ids = (messages || []).map(m => m.id)

  // 4. content(JSONB) 구성
  const posts     = (messages || []).filter(m => m.type === 'post')
  const comments  = (messages || []).filter(m => m.type === 'comment')
  const fruits    = (messages || []).filter(m => m.type === 'fruit')
  const harvested = fruits.filter(m => m.harvested_at)
  const seedRooms = (rooms || []).filter(r => r.seed_mode)
  const bloomedSeeds = seedRooms.filter(r => {
    if (!r.bloom_date) return false
    return new Date(r.bloom_date) <= new Date()
  })

  const content = {
    house: {
      id: house.id,
      title: house.title,
      primary_language: house.primary_language,
    },
    summary: {
      total_messages: (messages || []).length,
      total_posts: posts.length,
      total_comments: comments.length,
      total_fruits: fruits.length,
      total_harvested: harvested.length,
      total_rooms: (rooms || []).length,
      seed_rooms: seedRooms.length,
      bloomed_seeds: bloomedSeeds.length,
    },
    rooms: (rooms || []).map(r => ({
      id: r.id,
      room_name: r.room_name,
      visibility: r.visibility,
      seed_mode: r.seed_mode,
      bloom_date: r.bloom_date,
      message_count: (messages || []).filter(m => m.room_id === r.id).length,
    })),
    last_activity: posts.length > 0 ? posts[0].created_at : null,
    snapshot_range: {
      from: posts.length > 0 ? posts[posts.length - 1].created_at : null,
      to: posts.length > 0 ? posts[0].created_at : null,
    },
  }

  // 5. 기존 최신 버전 확인
  const { data: latest } = await supabase
    .from('house_snapshots')
    .select('derived_version')
    .eq('house_id', house_id)
    .eq('snapshot_type', snapshot_type || 'weekly')
    .order('derived_version', { ascending: false })
    .limit(1)
    .single()

  const derived_version = latest ? latest.derived_version + 1 : 1

  // 6. 스냅샷 생성
  const { data, error } = await supabase
    .from('house_snapshots')
    .insert({
      house_id,
      snapshot_type: snapshot_type || 'weekly',
      derived_at: new Date().toISOString(),
      derived_version,
      derived_by: derived_by || 'system',
      source_message_ids,
      content,
    })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST }