// CoreNull - Library API
// 서재 = 나의 활동 기록관
// 발자취 + 저장한 방 + 저장한 포스트 + 내가 쓴 포스트 + 수확된 열매
//
// NOTE(2026-08-31): closed_room_posts(별도 방 폐쇄 컬럼 기반) 되돌림.
// "방 종료 시 서재로 이동"은 이미 있는 메커니즘(열매 생성 →
// harvested_at) 하나로 충분했다 — Room 위에 얹힌 "씨드 컨텐츠뷰"가
// 열매로 끝나면 그 뷰가 서재로 옮겨가는 것이고, 이건 harvested_at
// 유무로 이미 표현된다. 별도 room.closed_at 컬럼은 불필요한 중복
// 상태였다.

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

    // 3. 내가 쓴 포스트 (post 타입만)
    supabase
      .from('messages')
      .select('*')
      .eq('owner_key', owner_key)
      .eq('type', 'post')
      .order('created_at', { ascending: false })
      .limit(50),

    // 4. 수확된 열매 — harvested_at IS NOT NULL인 fruit.
    //    씨드 컨텐츠뷰가 서재로 옮겨가는 유일한 경로가 이것이다.
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

  const saved_rooms = (bookmarksRes.data || []).filter(b => b.room_id && !b.message_id)
  const saved_posts = (bookmarksRes.data || []).filter(b => b.message_id && !b.room_id)

  return Response.json({
    data: {
      footprints:       footprintsRes.data     || [],
      saved_rooms,
      saved_posts,
      my_posts:         myPostsRes.data        || [],
      harvested_fruits: harvestedFruitsRes.data || [],
    },
    traceId,
  })
}

export { handler as GET }