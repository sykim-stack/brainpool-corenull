'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPostInterestState, interestPostBody } from '@/lib/interest'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { YardRelationRow } from '@/components/blocks/YardBlock'
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import OwnerGate from '@/components/corenull/OwnerGate'
import InlineHeroImageControls from '@/components/corenull/InlineHeroImageControls'
import YardHouseHandles from '@/components/corenull/YardHouseHandles'
import DoorplateEditModal from '@/components/corenull/DoorplateEditModal'
import HouseCreateForm from '@/components/corenull/HouseCreateForm'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'
import { createYardSampleView } from '@/lib/livingSamples'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

export interface FullContextData {
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
    myPosts: PostBlockData[]
    neighborFeed: PostBlockData[]
    publicPosts: PostBlockData[]
  }
  livingData: {
    rooms: any[]
  }
}

interface YardClientProps {
  initialData: FullContextData | null
  isServerComponent: boolean
}

function formatSince(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 부터`
}

function buildRingData(roomCount: number, neighborCount: number): RingData {
  return {
    rings: [
      { index: 0, weight: Math.min(1, 0.3 + roomCount * 0.12) },
      { index: 1, weight: Math.min(1, 0.2 + neighborCount * 0.1) },
      { index: 2, weight: 0.25 },
    ],
  }
}

function getRoomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

function mapNeighborsToChips(alleyNeighbors: any[]): NeighborChip[] {
  return alleyNeighbors.map((a, idx) => ({
    neighborId: a.neighborId,
    houseId: a.houseId,
    title: a.title,
    langFlag: a.langFlag,
    avatarUrl: a.avatarUrl,
    coverUrl: a.coverUrl || `/alley/alley-0${(idx % 5) + 1}.jpg`,
    rooms: a.rooms,
    requestPending: a.requestPending,
  }))
}

function mapRelations(neighbors: any[]): YardRelationRow[] {
  return neighbors.map(n => ({
    id: n.id,
    status: n.status,
    direction: n.direction,
    title: n.title,
    houseId: n.houseId,
    avatarUrl: n.avatarUrl,
    langFlag: n.langFlag,
  }))
}

export default function YardClient({ initialData, isServerComponent }: YardClientProps) {
  const router = useRouter()
  const [ownerKey, setOwnerKey] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const [loading, setLoading] = useState(!isServerComponent)
  const [houses, setHouses] = useState<any[]>([])
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [recommended, setRecommended] = useState<NeighborChip[]>([])
  const [relations, setRelations] = useState<YardRelationRow[]>([])
  const [neighborFeed, setNeighborFeed] = useState<PostBlockData[]>([])
  const [myPosts, setMyPosts] = useState<PostBlockData[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)
  const [applyLoadingHouseId, setApplyLoadingHouseId] = useState<string | null>(null)
  const [showDoorplateEdit, setShowDoorplateEdit] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [needsHouseCreate, setNeedsHouseCreate] = useState(false)

  // 초기 데이터 수화
  useEffect(() => {
    if (isServerComponent && initialData) {
      const ctx = initialData
      setOwnerKey(ctx.ownerKey)
      setOwnerReady(true)
      setHouses(ctx.myHouses)
      setHouse(ctx.activeHouse)
      setRooms(ctx.rooms)
      setRelations(mapRelations(ctx.neighbors))
      setRecommended(mapNeighborsToChips(ctx.alleyNeighbors))
      setNeighborFeed(ctx.yardData.neighborFeed)
      setMyPosts(ctx.yardData.myPosts)
      setBookmarks(ctx.bookmarks)
      setLoading(false)

      // 빈집 처리
      if (!ctx.activeHouse) {
        const sample = createYardSampleView(ctx.ownerKey)
        setHouse(null)
        setRooms([])
        setRelations([])
        setRecommended(sample.recommended)
        setNeighborFeed(sample.neighborFeed)
        setMyPosts(sample.myPosts)
        setNeedsHouseCreate(true)
        setLoading(false)
      } else if (ctx.yardData.myPosts.length === 0) {
        const sample = createYardSampleView(ctx.ownerKey)
        setMyPosts(sample.myPosts)
        setNeighborFeed(ctx.yardData.neighborFeed.length > 0 ? ctx.yardData.neighborFeed : sample.neighborFeed)
        setRecommended(ctx.alleyNeighbors.length > 0 ? mapNeighborsToChips(ctx.alleyNeighbors) : sample.recommended)
      }
    } else if (!isServerComponent) {
      // 클라이언트 폴백: localStorage에서 owner_key 읽기
      const key = localStorage.getItem('corenull_owner_key')
      const legacyDevice = localStorage.getItem('corenull_device_id')
      const finalKey = key || legacyDevice
      if (finalKey) {
        setOwnerKey(finalKey)
      }
      setOwnerReady(true)
    }
  }, [initialData, isServerComponent])

  // 클라이언트 폴백 로딩 (서버 데이터 없을 때만)
  const reload = useCallback(async (key: string, preferredHouseId?: string | null) => {
    if (isServerComponent) return // 서버 컴포넌트면 이미 로드됨
    
    const cacheKey = `yard_cache_${key}_${preferredHouseId || 'active'}`
    let hasCache = false
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.ts && Date.now() - parsed.ts < 300000) {
          hasCache = true
          setHouses(parsed.houses || [])
          if (parsed.house) setHouse(parsed.house)
          setRooms(parsed.rooms || [])
          setRelations(parsed.relations || [])
          setRecommended(parsed.recommended || [])
          setNeighborFeed(parsed.neighborFeed || [])
          setMyPosts(parsed.myPosts || [])
          setBookmarks(parsed.bookmarks || [])
          setLoading(false)
        }
      }
    } catch {}
    if (!hasCache) setLoading(true)
    
    try {
      const [hRes, bmRes] = await Promise.all([
        fetch(`/api/corenull/houses?owner_key=${key}`).then(r => r.json()),
        fetch(`/api/corenull/bookmarks?owner_key=${key}`).then(r => r.json()).catch(() => ({ data: [] })),
      ])
      if (hRes._error || !Array.isArray(hRes.data)) {
        setLoading(false)
        return
      }
      const list = hRes.data
      setHouses(list)
      setBookmarks(bmRes.data || [])
      const active = preferredHouseId
        ? list.find((h: any) => h.id === preferredHouseId) || list.find((h: any) => h.seed_started_at) || list[0]
        : list.find((h: any) => h.seed_started_at) || list[0]
      if (!active) {
        const sample = createYardSampleView(key)
        setHouse(null)
        setRooms([])
        setRelations([])
        setRecommended(sample.recommended)
        setNeighborFeed(sample.neighborFeed)
        setMyPosts(sample.myPosts)
        setNeedsHouseCreate(true)
        setLoading(false)
        return
      }
      setNeedsHouseCreate(false)
      setHouse(active)

      const [roomsRes, nbRes, discRes] = await Promise.all([
        fetch(`/api/corenull/rooms?house_id=${active.id}`).then(r => r.json()),
        fetch(`/api/corenull/houses?action=neighbors&house_id=${active.id}`).then(r => r.json()),
        fetch(`/api/corenull/houses?action=discover&house_id=${active.id}`).then(r => r.json()).catch(() => ({ data: [] })),
      ])

      const myRooms = roomsRes.data || []
      setRooms(myRooms)
      const neighbors = nbRes.data || []
      const accepted = neighbors.filter((n: any) => n.status === 'accepted')
      const pending = neighbors.filter((n: any) => n.status === 'pending')

      setRelations(mapRelations(neighbors))

      const pendingTargetIds = new Set(pending.filter((n: any) => n.direction === 'outgoing').map((n: any) => n.house?.id).filter(Boolean))
      const acceptedSlice = accepted.slice(0, 5).filter((n: any) => n.house?.id)

      // 골목 구성 (클라이언트 버전 - loadHouseRoomSlots 사용)
      const ALLEY_MAX_SLOTS = 6
      const haveIds = new Set<string>()
      const chipSources: { hh: any; requestPending?: boolean; fromNeighbor?: boolean }[] = []

      let discoverList = (discRes.data || []).filter((h: any) => h?.id)
      for (const hh of discoverList) {
        if (!hh?.id || haveIds.has(hh.id) || hh.id === active.id) continue
        haveIds.add(hh.id)
        chipSources.push({ hh, requestPending: pendingTargetIds.has(hh.id) })
        if (chipSources.length >= ALLEY_MAX_SLOTS) break
      }

      if (accepted.length < 5 && chipSources.length < ALLEY_MAX_SLOTS) {
        for (const n of acceptedSlice) {
          const hh = n.house
          if (!hh?.id || haveIds.has(hh.id)) continue
          haveIds.add(hh.id)
          chipSources.push({ hh, fromNeighbor: true })
          if (chipSources.length >= ALLEY_MAX_SLOTS) break
        }
      }

      if (chipSources.length < ALLEY_MAX_SLOTS) {
        for (const n of pending) {
          const hh = n.house
          if (!hh?.id || haveIds.has(hh.id)) continue
          haveIds.add(hh.id)
          chipSources.push({ hh, requestPending: n.direction === 'outgoing' })
          if (chipSources.length >= ALLEY_MAX_SLOTS) break
        }
      }

      const { loadHouseRoomSlots } = await import('@/lib/yardView')
      const chips = await Promise.all(
        chipSources.map(async ({ hh, requestPending }, idx) => {
          const slots = await loadHouseRoomSlots(hh.id)
          return {
            neighborId: hh.id,
            houseId: hh.id,
            title: hh.title || '집',
            langFlag: LANG_FLAG[hh.primary_language] || '🏡',
            avatarUrl: hh.avatar_url || null,
            coverUrl: hh.yard_image_url || `/alley/alley-0${(idx % 5) + 1}.jpg`,
            rooms: slots,
            requestPending: !!requestPending,
          } as NeighborChip
        }),
      )

      // 이웃 피드
      const feedNested = await Promise.all(
        acceptedSlice.map(async (n: any) => {
          const hh = n.house
          try {
            const rlist = await fetch(`/api/corenull/rooms?house_id=${hh.id}`).then(r => r.json())
            const roomsList = (rlist.data || []).filter((r: any) => r.visibility === 'public' || r.visibility === 'invite').slice(0, 2)
            const posts = await Promise.all(
              roomsList.map(async (rm: any) => {
                const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then(r => r.json())
                const latest = (pd.data || []).find((x: any) => x.type !== 'comment') || (pd.data || [])[0]
                if (!latest) return null
                return {
                  id: latest.id,
                  content: latest.content,
                  media: latest.meta?.media,
                  created_at: latest.created_at,
                  comment_count: latest.comment_count ?? 0,
                  room_id: rm.id,
                  view_meta: {
                    house_name: hh.title,
                    room_name: rm.room_name,
                    relation: '이웃',
                    status: getRoomStatusLabel(rm),
                  },
                } as PostBlockData
              }),
            )
            return posts.filter(Boolean) as PostBlockData[]
          } catch {
            return [] as PostBlockData[]
          }
        }),
      )
      const neighborFeedReal = feedNested.flat().slice(0, 20)

      // 내 방 최신
      const mineNested = await Promise.all(
        myRooms.slice(0, 15).map(async (rm: any) => {
          try {
            const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then(r => r.json())
            const latest = (pd.data || []).find((x: any) => x.type !== 'comment') || (pd.data || [])[0]
            if (!latest) return null
            return {
              id: latest.id,
              content: latest.content,
              media: latest.meta?.media,
              created_at: latest.created_at,
              comment_count: latest.comment_count ?? 0,
              room_id: rm.id,
              view_meta: {
                house_name: active.title,
                room_name: rm.room_name,
                status: getRoomStatusLabel(rm),
              },
            } as PostBlockData
          } catch {
            return null
          }
        }),
      )
      const myPostsReal = mineNested.filter(Boolean) as PostBlockData[]

      let finalMyPosts = myPostsReal
      let finalNeighborFeed = neighborFeedReal
      let finalRecommended = chips
      if (myPostsReal.length === 0) {
        const sample = createYardSampleView(key)
        finalMyPosts = sample.myPosts
        finalNeighborFeed = neighborFeedReal.length > 0 ? neighborFeedReal : sample.neighborFeed
        finalRecommended = chips.length > 0 ? chips : sample.recommended
      }
      setMyPosts(finalMyPosts)
      setNeighborFeed(finalNeighborFeed)
      setRecommended(finalRecommended)

      // 캐시 저장
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          ts: Date.now(),
          houses: list,
          house: active,
          rooms: myRooms,
          relations: mapRelations(neighbors),
          recommended: finalRecommended,
          neighborFeed: finalNeighborFeed,
          myPosts: finalMyPosts,
          bookmarks: bmRes.data || [],
        }))
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [router, isServerComponent])

  // 클라이언트 폴백용 useEffect
  useEffect(() => {
    if (!isServerComponent && ownerKey && ownerReady) {
      reload(ownerKey)
    }
  }, [ownerKey, ownerReady, reload, isServerComponent])

  const handleSwitchHouse = (id: string) => {
    if (isServerComponent) {
      // 서버 컴포넌트면 페이지 새로고침으로 집 전환
      router.refresh()
      // 또는 URL 기반으로 처리 필요
      window.location.href = `/yard?house=${id}`
    } else {
      reload(ownerKey, id)
    }
  }

  const handleApplyNeighbor = async (targetHouseId: string) => {
    setApplyLoadingHouseId(targetHouseId)
    try {
      await fetch('/api/corenull/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'neighbor_request',
          house_id: house.id,
          target_house_id: targetHouseId,
          owner_key: ownerKey,
        }),
      })
      if (!isServerComponent) {
        await reload(ownerKey, house.id)
      } else {
        router.refresh()
      }
    } finally {
      setApplyLoadingHouseId(null)
    }
  }

  const handleInterest = async (postId: string, roomId?: string) => {
    setInterestLoadingId(roomId || postId)
    try {
      const body = interestPostBody(ownerKey, postId, roomId)
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.data) setBookmarks((prev) => [...prev, data.data])
    } finally {
      setInterestLoadingId(null)
    }
  }

  if (!ownerReady) return null
  if (!ownerKey) return <OwnerGate />

  const acceptedCount = relations.filter((r) => r.status === 'accepted').length
  const langFlag = LANG_FLAG[house?.primary_language] || '🏡'

  const sampleHeroBg = {
    imageUrl: '/alley/alley-01.jpg',
    position: { x: 50, y: 40, scale: 1 },
  }

  return (
    <div style={{ position: 'relative' }}>
      <TopBar logo={<CoreNullLogo size="sm" />} title="마당" />
      <div
        style={
          needsHouseCreate
            ? {
                filter: 'blur(2.5px)',
                opacity: 0.72,
                pointerEvents: 'none',
                userSelect: 'none',
              }
            : undefined
        }
        aria-hidden={needsHouseCreate || undefined}
      >
        <YardBlock
          loading={loading}
          background={house ? houseHeroBackground(house, 'yard') : sampleHeroBg}
          heroControls={
            house && ownerKey ? (
              <InlineHeroImageControls
                houseId={house.id}
                ownerKey={ownerKey}
                view="yard"
                imageUrl={house.yard_image_url}
                position={house.yard_image_position}
                onSaved={(next) => setHouse(next)}
              />
            ) : undefined
          }
          avatarControls={
            house && ownerKey ? (
              <InlineHeroImageControls
                houseId={house.id}
                ownerKey={ownerKey}
                view="avatar"
                imageUrl={house.avatar_url}
                onSaved={(next) => setHouse(next)}
              />
            ) : undefined
          }
          doorplateHandles={
            house ? (
              <YardHouseHandles
                houses={houses.map((h) => ({
                  id: h.id,
                  title: h.title,
                  langFlag: LANG_FLAG[h.primary_language] || '🏡',
                }))}
                activeHouseId={house.id}
                onSwitch={handleSwitchHouse}
                onCreate={() => router.push('/houses/create')}
                onEditDoorplate={() => setShowDoorplateEdit(true)}
              />
            ) : undefined
          }
          ring={buildRingData(rooms.length, acceptedCount)}
          avatar={
            houseAvatarUrl(house) ? (
              <img
                src={houseAvatarUrl(house)!}
                alt=""
                style={{ width: 112, height: 112, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 20 }}>🏡</span>
            )
          }
          doorplate={{
            langFlag,
            title: house?.title || (needsHouseCreate ? '당신의 집' : ''),
            description: needsHouseCreate
              ? '집 이름을 정하면 마당이 열립니다'
              : house?.description,
            since: house?.created_at ? formatSince(house.created_at) : undefined,
            roomCount: rooms.length,
            neighborCount: acceptedCount,
          }}
          recommended={recommended}
          onRecommendHouseClick={(houseId) => router.push(`/houses/${houseId}/yard`)}
          onAcceptedNeighborClick={(houseId) => router.push(`/houses/${houseId}/living`)}
          onApplyNeighbor={handleApplyNeighbor}
          applyLoadingHouseId={applyLoadingHouseId}
          relations={relations}
          onOpenRelations={() => router.push('/me/neighbors')}
          neighborFeed={neighborFeed}
          myPosts={myPosts}
          onPostClick={(postId, roomId) => {
            if (roomId) router.push(`/rooms/${roomId}`)
          }}
          showInterest
          getInterestState={(postId: string, roomId?: string) =>
            getPostInterestState(bookmarks, postId, roomId)
          }
          interestLoadingId={interestLoadingId}
          onInterestClick={handleInterest}
          enableInlineComment
          ownerKey={ownerKey}
          onInterestGoLibrary={() => router.push('/me/library')}
        />
      </div>
      {needsHouseCreate && ownerKey && (
        <HouseCreateForm variant="modal" ownerKey={ownerKey} />
      )}
      {showDoorplateEdit && house && (
        <DoorplateEditModal
          houseId={house.id}
          ownerKey={ownerKey}
          title={house.title || ''}
          description={house.description || ''}
          onClose={() => setShowDoorplateEdit(false)}
          onSaved={(next) => {
            setHouse(next)
            setShowDoorplateEdit(false)
          }}
        />
      )}
      {showShare && house && (
        <ShareModal
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={house.title || 'CoreNull 마당'}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}