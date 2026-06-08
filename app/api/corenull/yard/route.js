// CoreNull - Yard API
// 마당 = public 방들의 포스트 피드
// visibility = 'public' 인 방들의 포스트 전체 조회

export const dynamic = 'force-dynamic'

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

  // public 방 목록 먼저
  const { data: rooms, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('id')
    .eq('visibility', 'public')

  if (roomError) return Response.json({ _error: roomError.message, traceId }, { status: 500 })

  const roomIds = (rooms || []).map(r => r.id)

  if (roomIds.length === 0) {
    return Response.json({ data: [], traceId })
  }

  // public 방들의 포스트 전체
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .in('room_id', roomIds)
    .in('type', ['post', 'event'])
    .not('meta', 'cs', '{"archived":true}')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as GET }