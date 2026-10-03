// CoreNull - Library API
// 서재 = 나의 활동 기록관
// 발자취 + 저장한 방 + 저장한 포스트 + 내가 쓴 포스트 + 수확된 열매

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

  const [footprintsRes, bookmarksRes, myPostsRes, harvestedFruitsRes] = await Promise.all([
    supabase
      .from('corenull_footprints')
      .select('*, corenull_rooms(id, room_name, house_id, corenull_houses(id, title))')
      .eq('owner_key', owner_key)
      .order('visited_at', { ascending: false })
      .limit(50),

    // 관심 — 방이면 house 이름까지, 글이면 content
    supabase
      .from('corenull_bookmarks')
      .select(
        '*, corenull_rooms(id, room_name, house_id, corenull_houses(id, title)), messages(id, content, meta)'
      )
      .eq('owner_key', owner_key)
      .order('created_at', { ascending: false }),

    supabase
      .from('messages')
      .select('*')
      .eq('owner_key', owner_key)
      .eq('type', 'post')
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('messages')
      .select('*')
      .eq('owner_key', owner_key)
      .eq('type', 'fruit')
      .not('harvested_at', 'is', null)
      .order('harvested_at', { ascending: false })
      .limit(50),
  ])

  if (footprintsRes.error) return Response.json({ _error: footprintsRes.error.message, traceId }, { status: 500 })
  if (bookmarksRes.error) return Response.json({ _error: bookmarksRes.error.message, traceId }, { status: 500 })
  if (myPostsRes.error) return Response.json({ _error: myPostsRes.error.message, traceId }, { status: 500 })
  if (harvestedFruitsRes.error) return Response.json({ _error: harvestedFruitsRes.error.message, traceId }, { status: 500 })

  // 활성 관심만 (ended_at IS NULL)
  const activeBookmarks = (bookmarksRes.data || []).filter((b) => !b.ended_at)

  // 관심 = Room 우선. room_id 있으면 방. message만 있으면 레거시 글 관심.
  const saved_rooms = activeBookmarks.filter((b) => !!b.room_id)
  const saved_posts = activeBookmarks.filter((b) => b.message_id && !b.room_id)

  const seenRoom = new Set()
  const dedupedFootprints = (footprintsRes.data || []).filter((fp) => {
    if (seenRoom.has(fp.room_id)) return false
    seenRoom.add(fp.room_id)
    return true
  })

  return Response.json({
    data: {
      footprints: dedupedFootprints,
      saved_rooms,
      saved_posts,
      my_posts: myPostsRes.data || [],
      harvested_fruits: harvestedFruitsRes.data || [],
    },
    traceId,
  })
}

export { handler as GET }
