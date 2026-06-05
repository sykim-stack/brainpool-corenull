// CoreNull - Library API
// 서재 = 나의 활동 기록관
// 발자취 + 저장한 방 + 저장한 포스트 + 내가 쓴 포스트
// 한 번의 호출로 전체 서재 반환

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const owner_key = searchParams.get('owner_key')

  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 병렬 조회
  const [footprintsRes, bookmarksRes, myPostsRes] = await Promise.all([

    // 1. 발자취 — 내가 다녀간 방
    supabase
      .from('corenull_footprints')
      .select('*')
      .eq('owner_key', owner_key)
      .order('visited_at', { ascending: false })
      .limit(50),

    // 2. 북마크 전체 — 저장한 방 + 저장한 포스트
    supabase
      .from('corenull_bookmarks')
      .select('*')
      .eq('owner_key', owner_key)
      .order('created_at', { ascending: false }),

    // 3. 내가 쓴 포스트
    supabase
      .from('messages')
      .select('*')
      .eq('type', 'post')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (footprintsRes.error) return Response.json({ _error: footprintsRes.error.message, traceId }, { status: 500 })
  if (bookmarksRes.error) return Response.json({ _error: bookmarksRes.error.message, traceId }, { status: 500 })
  if (myPostsRes.error) return Response.json({ _error: myPostsRes.error.message, traceId }, { status: 500 })

  // 북마크를 방/포스트로 분리
  const saved_rooms = (bookmarksRes.data || []).filter(b => b.room_id && !b.message_id)
  const saved_posts = (bookmarksRes.data || []).filter(b => b.message_id && !b.room_id)

  return Response.json({
    data: {
      footprints:  footprintsRes.data  || [],
      saved_rooms,
      saved_posts,
      my_posts:    myPostsRes.data     || [],
    },
    traceId,
  })
}

export { handler as GET }