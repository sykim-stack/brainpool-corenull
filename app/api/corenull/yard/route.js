// CoreNull - Yard API
// 마당 = public 방들의 포스트 피드
// visibility = 'public' 인 방들의 포스트 전체 조회
// room + house + seed 정보 join 포함
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET') return handleGet(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: rooms, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('id, room_name, house_id, seed_mode, bloom_date, corenull_houses(id, title, primary_language)')
    .eq('visibility', 'public')

  if (roomError) return Response.json({ _error: roomError.message, traceId }, { status: 500 })

  const roomIds = (rooms || []).map(r => r.id)
  if (roomIds.length === 0) return Response.json({ data: [], traceId })

  const { data: posts, error } = await supabase
    .from('messages')
    .select('*')
    .in('room_id', roomIds)
    .in('type', ['post', 'seed'])
    .not('meta', 'cs', '{"archived":true}')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  const roomMap = {}
  for (const room of (rooms || [])) {
    roomMap[room.id] = {
      room_name: room.room_name,
      house_id: room.house_id,
      house_title: room.corenull_houses?.title || null,
      house_language: room.corenull_houses?.primary_language || null,
      seed_mode: room.seed_mode || false,
      bloom_date: room.bloom_date || null,
    }
  }

  const data = (posts || []).map(post => ({
    ...post,
    _room: roomMap[post.room_id] || null,
  }))

  return Response.json({ data, traceId }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}

export { handler as GET }