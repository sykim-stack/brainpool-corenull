// CoreNull - Library API
// 서재 = 나의 활동 기록관
// 발자취 + 저장한 방 + 저장한 포스트 + 내가 쓴 포스트 + 수확된 열매
//         + 종료된 방(참여방/씨드방)의 내 포스팅
//
// NOTE(2026-08-30): closed_room_posts 추가. "중도 폐지된 방의
// 포스팅은 서재로 이동한다"는 결정을, harvested_at과 동일한 View
// 패턴으로 구현했다 — message row는 이동하지 않고, room.closed_at이
// 채워진 순간부터 그 room에 내가 쓴 post가 서재 조회에 포함된다.

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

  const [footprintsRes, bookmarksRes, myPostsRes, harvestedFruitsRes, closedRoomsRes] = await Promise.all([

    // 1. 발자취
    supabase
      .from('corenull_footprints')
      .select('*')
      .eq('owner_key', owner_key)
      .order('visited_at', { ascending: false })
      .limit(50),

    // 2. 북마크
    supabase
      .from('corenull_bookmarks')
      .select('*')
      .eq('owner_key', owner_key)
      .order('created_at', { ascending: false }),

    // 3. 내가 쓴 포스트 (post 타입만, 종료 안 된 방 기준 — 종료된 방은
    //    아래 closedRoomsRes에서 별도로 가져와 합친다)
    supabase
      .from('messages')
      .select('*')
      .eq('owner_key', owner_key)
      .eq('type', 'post')
      .order('created_at', { ascending: false })
      .limit(50),

    // 4. 수확된 열매 — harvested_at IS NOT NULL인 fruit
    supabase
      .from('messages')
      .select('*')
      .eq('owner_key', owner_key)
      .eq('type', 'fruit')
      .not('harvested_at', 'is', null)
      .order('harvested_at', { ascending: false })
      .limit(50),

    // 5. 종료된 방 목록 — closed_at이 있는 room. 이 room들에 내가
    //    쓴 post를 아래에서 필터링한다.
    supabase
      .from('corenull_rooms')
      .select('id, room_name, closed_at')
      .not('closed_at', 'is', null),
  ])

  if (footprintsRes.error) return Response.json({ _error: footprintsRes.error.message, traceId }, { status: 500 })
  if (bookmarksRes.error) return Response.json({ _error: bookmarksRes.error.message, traceId }, { status: 500 })
  if (myPostsRes.error) return Response.json({ _error: myPostsRes.error.message, traceId }, { status: 500 })
  if (harvestedFruitsRes.error) return Response.json({ _error: harvestedFruitsRes.error.message, traceId }, { status: 500 })
  if (closedRoomsRes.error) return Response.json({ _error: closedRoomsRes.error.message, traceId }, { status: 500 })

  const saved_rooms = (bookmarksRes.data || []).filter(b => b.room_id && !b.message_id)
  const saved_posts = (bookmarksRes.data || []).filter(b => b.message_id && !b.room_id)

  // 종료된 방 room_id 집합 — myPosts 중 이 room에 속한 것만 골라서
  // "closed_room_posts"로 분리. myPosts 자체(활성 방 글)에서는 제외.
  const closedRoomMap = new Map((closedRoomsRes.data || []).map(r => [r.id, r]))
  const allMyPosts = myPostsRes.data || []
  const closed_room_posts = allMyPosts
    .filter(p => closedRoomMap.has(p.room_id))
    .map(p => ({ ...p, _room: closedRoomMap.get(p.room_id) }))
  const active_my_posts = allMyPosts.filter(p => !closedRoomMap.has(p.room_id))

  return Response.json({
    data: {
      footprints:        footprintsRes.data      || [],
      saved_rooms,
      saved_posts,
      my_posts:          active_my_posts,
      harvested_fruits:  harvestedFruitsRes.data || [],
      closed_room_posts,
    },
    traceId,
  })
}

export { handler as GET }