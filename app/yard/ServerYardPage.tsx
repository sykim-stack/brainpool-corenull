import { headers } from 'next/headers'
import { createSupabaseServerClient, resolveOwnerKeysFromUser } from '@/lib/supabaseServer'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { buildAllViewHints } from '@/lib/viewHints'
import { fetchCoreHubOpportunities } from '@/lib/corehubAuthBridge'
import YardClient from './YardClient'
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';

interface FullContext {
  traceId: string
  ownerKey: string
  ownerKeys: string[]
  myHouses: any[]
  activeHouse: any
  rooms: any[]
  neighbors: any[]
  alleyNeighbors: any[]
  bookmarks: any[]
  opportunities: any[]
  viewHints: {
    yard: any
    living: any
    room: any
    plaza: any
    library: any
    neighbors: any
  }
  yardData: {
    myPosts: any[]
    neighborFeed: any[]
    publicPosts: any[]
  }
  livingData: {
    rooms: any[]
  }
}

async function getFullContext(): Promise<FullContext | null> {
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie') || ''
  console.log('[getFullContext] cookieHeader:', cookieHeader.substring(0, 50))
  
  // Supabase 세션에서 사용자 조회
  const supabaseServer = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser()
  console.log('[getFullContext] user:', user?.id, 'authError:', authError?.message)

  let ownerKeys: string[] = []
  
  if (!authError && user) {
    ownerKeys = await resolveOwnerKeysFromUser(user)
    console.log('[getFullContext] ownerKeys from user:', ownerKeys)
  }
  
  if (!ownerKeys.length) {
    const cookieOwnerKey = cookieHeader.match(/corenull_owner_key=([^;]+)/)?.[1]
    if (cookieOwnerKey) {
      ownerKeys = [cookieOwnerKey]
    }
  }

  if (!ownerKeys.length) {
    return null
  }

  const primaryOwnerKey = ownerKeys[0]
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    // 1단계: 독립적인 기본 쿼리들 병렬 실행
    const [housesRes, bookmarksRes] = await Promise.all([
      supabase
        .from('corenull_houses')
        .select('*, corenull_rooms(*)')
        .in('owner_key', ownerKeys)
        .order('created_at', { ascending: false }),
      supabase
        .from('corenull_bookmarks')
        .select('*, corenull_rooms(id, room_name), messages(id, type, content, meta)')
        .in('owner_key', ownerKeys)
        .order('created_at', { ascending: false }),
    ])

    const myHouses = housesRes.data || []
    const activeHouse = myHouses.find(h => h.created_at) || myHouses[0] || null
    const bookmarks = bookmarksRes.data || []

    if (!activeHouse) {
      // 집이 없으면 최소 컨텍스트만 반환 (나머지는 클라이언트/빈 상태 처리)
      const opportunities = await fetchCoreHubOpportunities(primaryOwnerKey)
      return {
        traceId: crypto.randomUUID(),
        ownerKey: primaryOwnerKey,
        ownerKeys,
        myHouses,
        activeHouse: null,
        rooms: [],
        neighbors: [],
        alleyNeighbors: [],
        bookmarks,
        opportunities,
        viewHints: buildAllViewHints(opportunities, [], []),
        yardData: { myPosts: [], neighborFeed: [], publicPosts: [] },
        livingData: { rooms: [] },
      }
    }

    const rooms = activeHouse.corenull_rooms || []

    // 2단계: 이웃 관계 + 내 방 게시물 병렬 조회
    const [neighborsRes, myPostsRes] = await Promise.all([
      supabase
        .from('corenull_neighbors')
        .select('*, corenull_houses!corenull_neighbors_house_b_id_fkey(id, title, primary_language, avatar_url, yard_image_url)')
        .or(`house_a_id.eq.${activeHouse.id},house_b_id.eq.${activeHouse.id}`)
        .order('created_at', { ascending: false }),
      (async () => {
        const visibleRooms = rooms.filter(r => r.visibility === 'public' || r.visibility === 'invite')
        const roomIds = visibleRooms.map(r => r.id)
        if (roomIds.length === 0) return { data: [] }
        return supabase
          .from('messages')
          .select('room_id, id, content, meta, created_at, type')
          .in('room_id', roomIds)
          .in('type', ['post', 'fruit'])
          .not('meta', 'cs', '{"deleted":true}')
          .order('created_at', { ascending: false })
      })(),
    ])

    const nbRows = neighborsRes.data || []
    const neighbors = nbRows.map(n => {
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

    const myPostsRaw = myPostsRes.data || []
    const postsByRoom: Record<string, any> = {}
    for (const p of myPostsRaw) {
      if (p.room_id && !postsByRoom[p.room_id]) postsByRoom[p.room_id] = p
    }

    const visibleRooms = rooms.filter(r => r.visibility === 'public' || r.visibility === 'invite')
    const myPosts = visibleRooms.slice(0, 15).map(rm => {
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

    // 3단계: 이웃 피드 + 골목 구성 + CoreHub 기회 병렬 실행
    const acceptedNeighborHouses = neighbors
      .filter(n => n.status === 'accepted' && n.houseId)
      .slice(0, 5)
      .map(n => n.houseId)

    const [alleyNeighbors, neighborFeed, opportunities] = await Promise.all([
      buildAlleyNeighborsOptimized(supabase, activeHouse.id, neighbors),
      (async () => {
        if (acceptedNeighborHouses.length === 0) return []
        const { data: nbRooms } = await supabase
          .from('corenull_rooms')
          .select('id, room_name, house_id')
          .in('house_id', acceptedNeighborHouses)
          .in('visibility', ['public', 'invite'])
          .order('created_at', { ascending: true })
        const nbRoomIds = (nbRooms || []).slice(0, 10).map(r => r.id)
        if (nbRoomIds.length === 0) return []
        const { data: nbPosts } = await supabase
          .from('messages')
          .select('room_id, id, content, meta, created_at, type')
          .in('room_id', nbRoomIds)
          .in('type', ['post', 'fruit'])
          .not('meta', 'cs', '{"deleted":true}')
          .order('created_at', { ascending: false })
        const nbPostsByRoom: Record<string, any> = {}
        for (const p of nbPosts || []) {
          if (p.room_id && !nbPostsByRoom[p.room_id]) nbPostsByRoom[p.room_id] = p
        }
        return (nbRooms || []).slice(0, 10).map(rm => {
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
      })(),
      fetchCoreHubOpportunities(primaryOwnerKey),
    ])

    const viewHints = buildAllViewHints(opportunities, rooms, alleyNeighbors)

    return {
      traceId: crypto.randomUUID(),
      ownerKey: primaryOwnerKey,
      ownerKeys,
      myHouses,
      activeHouse,
      rooms,
      neighbors,
      alleyNeighbors,
      bookmarks,
      opportunities,
      viewHints,
      yardData: { myPosts, neighborFeed, publicPosts: [] },
      livingData: { rooms: rooms.filter(r => r.visibility !== 'private') },
    }
  } catch (e) {
    console.error('[ServerYardPage] error:', e)
    return null
  }
}

// 헬퍼 함수들 (기존 page.tsx에서 이동)
function getRoomStatusLabel(rm: any) {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

async function buildAlleyNeighborsOptimized(supabase: any, currentHouseId: string, neighbors: any[]) {
  const ALLEY_NEIGHBOR_THRESHOLD = 5
  const ALLEY_MAX_SLOTS = 6
  const LANG_FLAG = { ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳' }

  const accepted = neighbors.filter(n => n.status === 'accepted')
  const pending = neighbors.filter(n => n.status === 'pending')
  const pendingTargetIds = new Set(pending.filter(n => n.direction === 'outgoing').map(n => n.houseId).filter(Boolean))

  const alley: any[] = []
  const haveIds = new Set<string>()

  // 1. 수락된 이웃 집들 - 슬롯 조회 병렬화
  const acceptedSlice = accepted.slice(0, ALLEY_MAX_SLOTS).filter(
    n => n.houseId && !haveIds.has(n.houseId) && n.houseId !== currentHouseId
  )
  acceptedSlice.forEach(n => haveIds.add(n.houseId))

  const acceptedSlots = await Promise.all(
    acceptedSlice.map(n => loadHouseRoomSlotsOptimized(supabase, n.houseId!))
  )

  acceptedSlice.forEach((n, idx) => {
    alley.push({
      neighborId: n.id,
      houseId: n.houseId,
      title: n.title,
      langFlag: n.langFlag,
      avatarUrl: n.avatarUrl,
      coverUrl: null,
      rooms: acceptedSlots[idx],
    })
  })
    if (accepted.length < ALLEY_NEIGHBOR_THRESHOLD && alley.length < ALLEY_MAX_SLOTS) {      const need = ALLEY_MAX_SLOTS - alley.length;      const { data: discoverHouses } = await supabase        .from('corenull_houses')        .select('id, title, primary_language, avatar_url, yard_image_url')        .neq('id', currentHouseId)        .order('created_at', { ascending: false })        .limit(40);      const excludedIds = new Set(haveIds);      const { data: rels } = await supabase        .from('corenull_neighbors')        .select('house_a_id, house_b_id')        .or(`house_a_id.eq.${currentHouseId},house_b_id.eq.${currentHouseId}`);    for (const r of rels || [] ) {      excludedIds.add(r.house_a_id);      excludedIds.add(r.house_b_id);    }      const candidateHouses = (discoverHouses || []).filter((h: { id: string; primary_language?: string; avatar_url?: string; yard_image_url?: string; title?: string }) =>        h?.id && !excludedIds.has(h.id));      const candidateHousesSlice = candidateHouses.slice(0, need);      const discoverSlots = await Promise.all(        candidateHousesSlice.map((h: { id: string }) => loadHouseRoomSlotsOptimized(supabase, h.id))      );      candidateHousesSlice.forEach((h: { id: string; title?: string; primary_language?: string; avatar_url?: string; yard_image_url?: string }, idx: number) => {        alley.push({          neighborId: `discover:${h.id}`,          houseId: h.id,          title: h.title || '집',          langFlag: LANG_FLAG[h.primary_language as keyof typeof LANG_FLAG] || '🏡',          avatarUrl: h.avatar_url || null,          coverUrl: h.yard_image_url || null,          rooms: discoverSlots[idx],          requestPending: pendingTargetIds.has(h.id),        });      });    };  }  return alley;}  // 2. 이웃 부족 시 발견 집 채움
    if (accepted.length < ALLEY_NEIGHBOR_THRESHOLD && alley.length < ALLEY_MAX_SLOTS) {      const need = ALLEY_MAX_SLOTS - alley.length      const { data: discoverHouses } = await supabase        .from('corenull_houses')        .select('id, title, primary_language, avatar_url, yard_image_url')        .neq('id', currentHouseId)        .order('created_at', { ascending: false })        .limit(40)      const excludedIds = new Set(haveIds)      const { data: rels } = await supabase        .from('corenull_neighbors')        .select('house_a_id, house_b_id')        .or(`house_a_id.eq.${currentHouseId},house_b_id.eq.${currentHouseId}`)      for (const r of rels || []) {        excludedIds.add(r.house_a_id)        excludedIds.add(r.house_b_id)      }      const candidateHouses = (discoverHouses || [])        .filter((h: { id: string; primary_language?: string; avatar_url?: string; yard_image_url?: string; title?: string }) =>           h?.id && !excludedIds.has(h.id))        .slice(0, need)      const discoverSlots = await Promise.all(        candidateHouses.map((h: { id: string }) => loadHouseRoomSlotsOptimized(supabase, h.id))      )      candidateHouses.forEach((h: { id: string; title?: string; primary_language?: string; avatar_url?: string; yard_image_url?: string }, idx: number) => {        alley.push({          neighborId: `discover:${h.id}` ,          houseId: h.id ,          title: h.title || '집' ,          langFlag: LANG_FLAG[h.primary_language as keyof typeof LANG_FLAG] || '🏡' ,          avatarUrl: h.avatar_url || null ,          coverUrl: h.yard_image_url || null ,          rooms: discoverSlots[idx] ,          requestPending: pendingTargetIds.has(h.id) ,        })      });    });  }  return alley}    .from('corenull_rooms')

  return rooms.map((rm: any) => ({
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

export default async function ServerYardPage() {
  const context = await getFullContext()
  console.log('[ServerYardPage] context:', context ? 'loaded' : 'null')
  
  if (!context) {
    // 인증되지 않은 사용자는 클라이언트에서 OwnerGate 표시
    return (
      <YardClient 
        initialData={null}
        isServerComponent={false}
      />
    )
  }

  return (
    <YardClient 
      initialData={context}
      isServerComponent={true}
    />
  )
}