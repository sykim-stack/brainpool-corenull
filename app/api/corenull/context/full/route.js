// app/api/corenull/context/full/route.js
// CoreNull 통합 컨텍스트 API (Server Component용)
// - Supabase 세션 쿠키로 사용자 인증 (Server Component/API Route 가능)
// - Supabase 직접 조회로 N+1 제거 (HTTP 호출 없음, 배치 쿼리)
// - CoreHub 기회 조회 (실패 시 빈 배열, CoreNull 단독 동작 보장)
// - 개인화 데이터이므로 no-store

export const dynamic = 'force-dynamic'
export const revalidate = 0  // 개인화 데이터 캐시 금지

import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient, resolveOwnerKeysFromUser } from '@/lib/supabaseServer'
import { fetchCoreHubOpportunities } from '@/lib/corehubAuthBridge'
import { buildAllViewHints } from '@/lib/viewHints'

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  const { searchParams } = new URL(req.url)

  // 1. 사용자 식별: Supabase 세션에서 인증된 사용자 조회
  const supabaseServer = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser()

  if (authError || !user) {
    // 폴백: 쿼리 파라미터로 owner_key 전달 (개발/테스트용)
    const owner_key = searchParams.get('owner_key')
    if (!owner_key) {
      return Response.json(
        { _error: 'auth_required', traceId, hint: 'Login required or provide owner_key query param' },
        { status: 401 }
      )
    }
    // 쿼리 파라미터로 전달된 owner_key 검증 (corenull_owner_identities에 존재하는지 확인)
    const adminClient = getSupabaseAdmin()
    if (adminClient) {
      const { data: identity } = await adminClient
        .from('corenull_owner_identities')
        .select('owner_key')
        .eq('owner_key', owner_key)
        .maybeSingle()
      if (!identity) {
        return Response.json(
          { _error: 'invalid_owner_key', traceId },
          { status: 401 }
        )
      }
    }
    // 검증된 owner_key로 진행
    return handleRequest(req, traceId, [owner_key])
  }

  // 2. 인증된 사용자에서 owner_key[] 추출
  const ownerKeys = await resolveOwnerKeysFromUser(user)
  if (!ownerKeys.length) {
    return Response.json(
      { _error: 'owner_key_not_linked', traceId, hint: 'User has no linked owner_key' },
      { status: 401 }
    )
  }

  // 첫 번째 owner_key 사용 (보통 1개만 있음)
  return handleRequest(req, traceId, ownerKeys)
}

async function handleRequest(req, traceId, ownerKeys) {
  const primaryOwnerKey = ownerKeys[0]
  const { searchParams } = new URL(req.url)

  const supabase = getSupabase()
  if (!supabase) {
    return Response.json(
      { _error: 'supabase_init_failed', traceId },
      { status: 500 }
    )
  }

  try {
    // 2. CoreNull 기본 데이터: 직접 DB 조회 (HTTP 호출 제거, N+1 없음)
    // ownerKeys 배열로 IN 쿼리 가능 (여러 owner_key 지원)
    const { data: houses } = await supabase
      .from('corenull_houses')
      .select('*, corenull_rooms(*)')
      .in('owner_key', ownerKeys)
      .order('created_at', { ascending: false })

    const { data: bookmarks } = await supabase
      .from('corenull_bookmarks')
      .select('*, corenull_rooms(id, room_name), messages(id, type, content, meta)')
      .in('owner_key', ownerKeys)
      .order('created_at', { ascending: false })

    // 활성 집 선택 (seed_started_at 있는 집 우선)
    const myHouses = houses || []
    const activeHouse = myHouses.find(h => h.seed_started_at) || myHouses[0] || null

    let rooms = []
    let neighbors = []
    let alleyNeighbors = []
    let myPosts = []
    let neighborFeed = []
    let publicPosts = []

    if (activeHouse) {
      // 3. 활성 집 방들 (이미 houses 쿼리에 포함됨)
      rooms = activeHouse.corenull_rooms || []

      // 4. 이웃 관계 (단일 쿼리, 집 정보 포함)
      const { data: nbRows } = await supabase
        .from('corenull_neighbors')
        .select('*, corenull_houses!corenull_neighbors_house_b_id_fkey(id, title, primary_language, avatar_url, yard_image_url)')
        .or(`house_a_id.eq.${activeHouse.id},house_b_id.eq.${activeHouse.id}`)
        .order('created_at', { ascending: false })

      neighbors = (nbRows || []).map(n => {
        const isA = n.house_a_id === activeHouse.id
        const house = n.corenull_houses
        return {
          id: n.id,
          status: n.status,
          direction: isA ? 'outgoing' : 'incoming',
          title: house?.title || '집',
          houseId: house?.id,
          avatarUrl: house?.avatar_url || null,
          langFlag: house?.primary_language
            ? { ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳' }[house.primary_language] || '🏡'
            : '🏡',
        }
      })

      // 5. 골목(알리) 구성: 이웃 + 발견 집 (단일 쿼리로 최적화)
      alleyNeighbors = await buildAlleyNeighborsOptimized(supabase, activeHouse.id, neighbors)

      // 6. 게시물 배치 조회 (room_id IN (...)로 N+1 제거)
      const visibleRooms = rooms.filter(r => r.visibility === 'public' || r.visibility === 'invite')
      const roomIds = visibleRooms.map(r => r.id)

      let postsByRoom = {}
      if (roomIds.length > 0) {
        const { data: posts } = await supabase
          .from('messages')
          .select('room_id, id, content, meta, created_at, type')
          .in('room_id', roomIds)
          .in('type', ['post', 'fruit'])
          .not('meta', 'cs', '{"deleted":true}')
          .order('created_at', { ascending: false })

        // 방별 최신 1개만 추출
        for (const p of posts || []) {
          if (!postsByRoom[p.room_id]) postsByRoom[p.room_id] = p
        }
      }

      // 내 방 최신 글
      myPosts = visibleRooms.slice(0, 15).map(rm => {
        const p = postsByRoom[rm.id]
        if (!p) return null
        return {
          id: p.id,
          content: p.content,
          media: p.meta?.media,
          created_at: p.created_at,
          comment_count: p.meta?.comment_count ?? 0,
          room_id: rm.id,
          view_meta: {
            house_name: activeHouse.title,
            room_name: rm.room_name,
            status: getRoomStatusLabel(rm),
          },
        }
      }).filter(Boolean)

      // 이웃 피드 (수락된 이웃의 공개/이웃공개 방 최신 글)
      const acceptedNeighborHouses = neighbors
        .filter(n => n.status === 'accepted' && n.houseId)
        .slice(0, 5)
        .map(n => n.houseId)

      if (acceptedNeighborHouses.length > 0) {
        const { data: nbRooms } = await supabase
          .from('corenull_rooms')
          .select('id, room_name, house_id')
          .in('house_id', acceptedNeighborHouses)
          .in('visibility', ['public', 'invite'])
          .order('created_at', { ascending: true })

        const nbRoomIds = (nbRooms || []).slice(0, 10).map(r => r.id)
        if (nbRoomIds.length > 0) {
          const { data: nbPosts } = await supabase
            .from('messages')
            .select('room_id, id, content, meta, created_at, type')
            .in('room_id', nbRoomIds)
            .in('type', ['post', 'fruit'])
            .not('meta', 'cs', '{"deleted":true}')
            .order('created_at', { ascending: false })

          const nbPostsByRoom = {}
          for (const p of nbPosts || []) {
            if (!nbPostsByRoom[p.room_id]) nbPostsByRoom[p.room_id] = p
          }

          neighborFeed = (nbRooms || []).slice(0, 10).map(rm => {
            const p = nbPostsByRoom[rm.id]
            if (!p) return null
            return {
              id: p.id,
              content: p.content,
              media: p.meta?.media,
              created_at: p.created_at,
              comment_count: p.meta?.comment_count ?? 0,
              room_id: rm.id,
              view_meta: {
                house_name: neighbors.find(n => n.houseId === rm.house_id)?.title || '이웃',
                room_name: rm.room_name,
                relation: '이웃',
                status: '이웃공개',
              },
            }
          }).filter(Boolean)
        }
      }
    }

    // 7. CoreHub 기회 조회 (실패 시 빈 배열, CoreNull 단독 동작 보장)
    // CoreHub는 Bearer 인증 필요 → 현재는 빈 배열 반환
    const opportunities = await fetchCoreHubOpportunities(primaryOwnerKey)

    // 8. 뷰 힌트 생성 (CoreNull 자기 영역 로직)
    const viewHints = buildAllViewHints(opportunities, rooms, alleyNeighbors)

    // 9. 통합 응답 (no-store)
    return Response.json({
      traceId,
      ownerKey: primaryOwnerKey,
      ownerKeys,  // 여러 owner_key 지원
      // CoreNull 기본 데이터
      myHouses,
      activeHouse,
      rooms,
      neighbors,
      alleyNeighbors,
      bookmarks: bookmarks || [],
      // CoreHub 기회 (있을 때만)
      opportunities,
      // 전 뷰 힌트 (CoreNull이 자기 영역에서 결정)
      viewHints,
      // 뷰별 편의 데이터
      yardData: { myPosts, neighborFeed, publicPosts },
      livingData: { rooms: rooms.filter(r => r.visibility !== 'private') },
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',  // 개인화 데이터 캐시 금지
      },
    })

  } catch (e) {
    console.error('[context/full] error:', e)
    return Response.json(
      { _error: 'internal_error', traceId, message: String(e) },
      { status: 500 }
    )
  }
}

// 헬퍼: 골목 구성 최적화 (단일 쿼리로 이웃+발견 집 방 슬롯 조회)
async function buildAlleyNeighborsOptimized(supabase, currentHouseId, neighbors) {
  const ALLEY_NEIGHBOR_THRESHOLD = 5
  const ALLEY_MAX_SLOTS = 6
  const LANG_FLAG = { ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳' }

  const accepted = neighbors.filter(n => n.status === 'accepted')
  const pending = neighbors.filter(n => n.status === 'pending')
  const pendingTargetIds = new Set(pending.filter(n => n.direction === 'outgoing').map(n => n.houseId).filter(Boolean))

  const alley = []
  const haveIds = new Set()

  // 1. 수락된 이웃 집들 (최대 5개)
  for (const n of accepted.slice(0, ALLEY_MAX_SLOTS)) {
    if (n.houseId && !haveIds.has(n.houseId) && n.houseId !== currentHouseId) {
      haveIds.add(n.houseId)
      const slots = await loadHouseRoomSlotsOptimized(supabase, n.houseId)
      alley.push({
        neighborId: n.id,
        houseId: n.houseId,
        title: n.title,
        langFlag: n.langFlag,
        avatarUrl: n.avatarUrl,
        coverUrl: null,
        rooms: slots,
      })
    }
  }

  // 2. 이웃 부족 시 발견 집 채움
  if (accepted.length < ALLEY_NEIGHBOR_THRESHOLD && alley.length < ALLEY_MAX_SLOTS) {
    const need = ALLEY_MAX_SLOTS - alley.length
    const { data: discoverHouses } = await supabase
      .from('corenull_houses')
      .select('id, title, primary_language, avatar_url, yard_image_url')
      .neq('id', currentHouseId)
      .order('created_at', { ascending: false })
      .limit(40)

    const excludedIds = new Set(haveIds)
    // 이웃 관계 있는 집 제외
    const { data: rels } = await supabase
      .from('corenull_neighbors')
      .select('house_a_id, house_b_id')
      .or(`house_a_id.eq.${currentHouseId},house_b_id.eq.${currentHouseId}`)
    for (const r of rels || []) {
      excludedIds.add(r.house_a_id)
      excludedIds.add(r.house_b_id)
    }

    for (const h of (discoverHouses || []).filter(h => h?.id && !excludedIds.has(h.id)).slice(0, need)) {
      haveIds.add(h.id)
      const slots = await loadHouseRoomSlotsOptimized(supabase, h.id)
      alley.push({
        neighborId: `discover:${h.id}`,
        houseId: h.id,
        title: h.title || '집',
        langFlag: LANG_FLAG[h.primary_language] || '🏡',
        avatarUrl: h.avatar_url || null,
        coverUrl: h.yard_image_url || null,
        rooms: slots,
        requestPending: pendingTargetIds.has(h.id),
      })
    }
  }

  return alley
}

// 헬퍼: 집의 공개/이웃공개 방 + 최신 글 단일 쿼리로 조회
async function loadHouseRoomSlotsOptimized(supabase, houseId) {
  const { data: rooms } = await supabase
    .from('corenull_rooms')
    .select('id, room_name')
    .eq('house_id', houseId)
    .in('visibility', ['public', 'invite'])
    .order('created_at', { ascending: true })
    .limit(6)

  if (!rooms?.length) return []

  const roomIds = rooms.map(r => r.id)
  const { data: posts } = await supabase
    .from('messages')
    .select('room_id, id, content, meta, created_at, type')
    .in('room_id', roomIds)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')
    .order('created_at', { ascending: false })

  const latestByRoom = {}
  for (const p of posts || []) {
    if (!latestByRoom[p.room_id]) latestByRoom[p.room_id] = p
  }

  return rooms.map(rm => ({
    roomId: rm.id,
    roomName: rm.room_name,
    latestPost: latestByRoom[rm.id] ? {
      id: latestByRoom[rm.id].id,
      content: latestByRoom[rm.id].content,
      media: latestByRoom[rm.id].meta?.media,
      created_at: latestByRoom[rm.id].created_at,
      comment_count: latestByRoom[rm.id].meta?.comment_count ?? 0,
      room_id: rm.id,
    } : null,
  }))
}

function getRoomStatusLabel(rm) {
  const parts = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.join(' · ') || '방'
}

export { handler as GET }