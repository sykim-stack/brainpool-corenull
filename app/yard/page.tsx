'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import { actorFetch } from '@/lib/actorFetch'
import {
  getPostInterestState,
  findInterestBookmark,
  interestPostBody,
} from '@/lib/interest'
import { pickActiveHouse, setActiveHouseId } from '@/lib/activeHouse'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { YardRelationRow } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import OwnerGate from '@/components/corenull/OwnerGate'
import InlineHeroImageControls from '@/components/corenull/InlineHeroImageControls'
import YardHouseHandles from '@/components/corenull/YardHouseHandles'
import DoorplateEditModal from '@/components/corenull/DoorplateEditModal'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { NeighborChip, NeighborRoomSlot } from '@/components/blocks/NeighborContentBlock'
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'
import { adaptRoomStage, computeStage } from '@/lib/roomStage'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function isYardVisibleRoom(rm: any) {
  return rm.visibility === 'public' || rm.visibility === 'invite'
}

function roomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

function buildRingData(roomCount: number, neighborCount: number): RingData {
  return {
    rings: [
      { index: 0, weight: Math.min(roomCount / 6, 1) },
      { index: 1, weight: Math.min(1, 0.2 + neighborCount * 0.1) },
      { index: 2, weight: 0.55 },
    ],
  }
}

async function loadHouseRoomSlots(h: any): Promise<NeighborRoomSlot[]> {
  try {
    const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
    const list = (rd.data || []).filter(isYardVisibleRoom).slice(0, 6)
    return Promise.all(
      list.map(async (rm: any) => {
        const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
        const latest = (pd.data || [])[0]
        return {
          roomId: rm.id,
          roomName: rm.room_name,
          latestPost: latest
            ? ({
                id: latest.id,
                content: latest.content,
                media: latest.meta?.media,
                created_at: latest.created_at,
                comment_count: latest.comment_count ?? 0,
                room_id: rm.id,
                view_meta: {
                  room_name: rm.room_name,
                  house_name: h.title,
                  status: roomStatusLabel(rm),
                  stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
                },
              } as PostBlockData)
            : null,
        }
      })
    )
  } catch {
    return []
  }
}

type BookmarkRow = { id: string; room_id?: string | null; message_id?: string | null; ended_at?: string | null }

export default function YardPage() {
  const router = useRouter()
  const [ownerKey, setOwnerKey] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const [house, setHouse] = useState<any>(null)
  const [houses, setHouses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [showDoorplate, setShowDoorplate] = useState(false)
  const [recommended, setRecommended] = useState<NeighborChip[]>([])
  const [accepted, setAccepted] = useState<NeighborChip[]>([])
  const [relations, setRelations] = useState<YardRelationRow[]>([])
  const [neighborFeed, setNeighborFeed] = useState<PostBlockData[]>([])
  const [myFeed, setMyFeed] = useState<PostBlockData[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)
  const [applyLoadingHouseId, setApplyLoadingHouseId] = useState<string | null>(null)
  const [relationActingId, setRelationActingId] = useState<string | null>(null)
  const [roomCount, setRoomCount] = useState(0)

  const loadAll = useCallback(async (key: string, preferredHouseId?: string | null) => {
    setLoading(true)
    try {
      const [hData, bData] = await Promise.all([
        fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json()),
        fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((r) => r.json()),
      ])
      if (bData.data) setBookmarks(bData.data)
      const list = hData.data || []
      setHouses(list)
      const h = preferredHouseId
        ? list.find((x: any) => x.id === preferredHouseId) || pickActiveHouse(list) || list[0]
        : pickActiveHouse(list) || list[0]
      if (!h) {
        setHouse(null)
        setLoading(false)
        return
      }
      setHouse(h)
      setActiveHouseId(h.id)

      const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
      const rooms = (rd.data || []).filter(isYardVisibleRoom)
      setRoomCount(rooms.length)

      const [nb, disc] = await Promise.all([
        fetch(`/api/corenull/houses?action=neighbors&house_id=${h.id}`).then((r) => r.json()),
        fetch(`/api/corenull/houses?action=discover&house_id=${h.id}&owner_key=${key}`).then((r) => r.json()),
      ])

      const nbRows = nb.data || []
      const pendingTargetIds = new Set(
        nbRows.filter((n: any) => n.status === 'pending' && n.house).map((n: any) => n.house.id)
      )

      const rel: YardRelationRow[] = nbRows.map((n: any) => ({
        id: n.id,
        status: n.status,
        houseId: n.house?.id,
        title: n.house?.title || '이웃',
        langFlag: LANG_FLAG[n.house?.primary_language] || '🌐',
        avatarUrl: n.house?.avatar_url || null,
        direction: n.direction,
      }))
      setRelations(rel)

      const discHouses = (disc.data || []).slice(0, 8)
      const rec: NeighborChip[] = await Promise.all(
        discHouses.map(async (hh: any, index: number) => {
          const roomSlots = await loadHouseRoomSlots(hh)
          return {
            neighborId: hh.id,
            houseId: hh.id,
            title: hh.title,
            langFlag: LANG_FLAG[hh.primary_language] || '🌐',
            avatarUrl: hh.avatar_url || null,
            coverUrl: `/alley/alley-${String((index % 5) + 1).padStart(2, '0')}.jpg`,
            rooms: roomSlots,
            requestPending: pendingTargetIds.has(hh.id),
          }
        })
      )
      setRecommended(rec)

      const acceptedRows = nbRows.filter((n: any) => n.status === 'accepted' && n.house)
      const acc: NeighborChip[] = await Promise.all(
        acceptedRows.map(async (n: any, index: number) => {
          const hh = n.house
          const roomSlots = await loadHouseRoomSlots(hh)
          return {
            neighborId: n.id,
            houseId: hh.id,
            title: hh.title,
            langFlag: LANG_FLAG[hh.primary_language] || '🌐',
            avatarUrl: hh.avatar_url || null,
            coverUrl: `/alley/alley-${String((index % 5) + 1).padStart(2, '0')}.jpg`,
            rooms: roomSlots,
          }
        })
      )
      setAccepted(acc)

      // neighbor feed: latest posts from accepted houses
      const feed: PostBlockData[] = []
      for (const n of acceptedRows.slice(0, 6)) {
        const hh = n.house
        try {
          const rlist = await fetch(`/api/corenull/rooms?house_id=${hh.id}`).then((r) => r.json())
          for (const rm of (rlist.data || []).filter(isYardVisibleRoom).slice(0, 3)) {
            try {
              const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
              const p = (pd.data || []).find((x: any) => x.type !== 'comment' && !x.meta?.deleted)
              if (p) {
                feed.push({
                  id: p.id,
                  content: p.content,
                  media: p.meta?.media,
                  created_at: p.created_at,
                  comment_count: p.comment_count ?? 0,
                  room_id: rm.id,
                  view_meta: {
                    house_name: hh.title,
                    room_name: rm.room_name,
                    relation: '이웃',
                    status: roomStatusLabel(rm),
                    stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
                  },
                })
              }
            } catch {}
          }
        } catch {}
      }
      feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNeighborFeed(feed.slice(0, 12))

      // my feed
      const mine: PostBlockData[] = []
      for (const rm of rooms.slice(0, 8)) {
        try {
          const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
          const p = (pd.data || []).find((x: any) => x.type !== 'comment' && !x.meta?.deleted)
          if (p) {
            const stage = adaptRoomStage(rm)
            mine.push({
              id: p.id,
              content: p.content,
              media: p.meta?.media,
              created_at: p.created_at,
              comment_count: p.comment_count ?? 0,
              room_id: rm.id,
              view_meta: {
                house_name: h.title,
                room_name: rm.room_name,
                relation: '나',
                status: roomStatusLabel(rm),
                stage_emoji: computeStage(stage)?.emoji || (rm.seed_mode ? '🌱' : undefined),
              },
            })
          }
        } catch {}
      }
      mine.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setMyFeed(mine.slice(0, 6))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key)
    setOwnerReady(true)
    if (!key) {
      setLoading(false)
      return
    }
    loadAll(key)
  }, [loadAll])

  const handleSwitchHouse = (houseId: string) => {
    setActiveHouseId(houseId)
    if (ownerKey) loadAll(ownerKey, houseId)
  }

  const handleApplyNeighbor = async (targetHouseId: string) => {
    if (!house || !ownerKey || applyLoadingHouseId) return
    setApplyLoadingHouseId(targetHouseId)
    try {
      await actorFetch('/api/corenull/houses?action=neighbor-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house_a_id: house.id, owner_key: ownerKey, house_b_id: targetHouseId }),
      })
      await loadAll(ownerKey, house.id)
    } finally {
      setApplyLoadingHouseId(null)
    }
  }

  const handleAcceptRelation = async (id: string) => {
    if (!ownerKey || relationActingId) return
    setRelationActingId(id)
    await actorFetch('/api/corenull/houses?action=neighbor-accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighbor_id: id, owner_key: ownerKey }),
    })
    await loadAll(ownerKey, house?.id)
    setRelationActingId(null)
  }

  const handleRemoveRelation = async (id: string) => {
    if (!ownerKey || relationActingId) return
    setRelationActingId(id)
    await actorFetch(
      `/api/corenull/houses?action=neighbor-cancel&neighbor_id=${id}&owner_key=${ownerKey}`,
      { method: 'DELETE' }
    )
    await loadAll(ownerKey, house?.id)
    setRelationActingId(null)
  }

  const handleInterest = async (postId: string, roomId?: string) => {
    if (!ownerKey) return
    const targetId = roomId || postId
    setInterestLoadingId(targetId)
    const existing = findInterestBookmark(bookmarks, postId, roomId)
    try {
      if (!existing) {
        const res = await actorFetch('/api/corenull/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(interestPostBody(ownerKey, postId, roomId)),
        })
        const data = await res.json()
        if (data.data) setBookmarks((prev) => [...prev, data.data])
      } else {
        const action = existing.ended_at ? 'resume' : 'end'
        const res = await actorFetch('/api/corenull/bookmarks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existing.id, owner_key: ownerKey, action }),
        })
        const data = await res.json()
        if (data.data) {
          setBookmarks((prev) => prev.map((bm) => (bm.id === existing.id ? data.data : bm)))
        }
      }
    } finally {
      setInterestLoadingId(null)
    }
  }

  const getInterestState = (postId: string, roomId?: string): 'none' | 'active' | 'ended' => {
    return getPostInterestState(bookmarks, postId, roomId)
  }

  const langFlag = LANG_FLAG[house?.primary_language] || '🏡'
  const acceptedCount = relations.filter((r) => r.status === 'accepted').length

  if (ownerReady && !ownerKey) {
    return <OwnerGate />
  }

  if (ownerReady && ownerKey && !loading && !house) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 16 }}>
        <div style={{ fontSize: 40 }}>🏡</div>
        <div style={{ color: '#5C4A35' }}>아직 집이 없어요</div>
        <button
          type="button"
          onClick={() => router.push('/houses/create')}
          style={{ padding: '10px 18px', background: '#2C1810', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
        >
          집 만들기
        </button>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당"
        actions={[
          { key: 'living', emoji: '🛋', label: '거실', onClick: () => router.push('/living') },
          { key: 'share', emoji: '📤', label: '초대', onClick: () => setShowShare(true) },
        ]}
      />

      {houses.length > 0 && (
        <YardHouseHandles
          houses={houses}
          activeHouseId={house?.id}
          onSwitch={handleSwitchHouse}
          onEditDoorplate={() => setShowDoorplate(true)}
          onCreate={() => router.push('/houses/create')}
        />
      )}

      <YardBlock
        loading={loading}
        background={houseHeroBackground(house, 'yard')}
        heroControls={
          house && ownerKey ? (
            <InlineHeroImageControls
              houseId={house.id}
              ownerKey={ownerKey}
              view="yard"
              imageUrl={house.yard_image_url}
              position={house.yard_image_position}
              onSaved={(nextHouse) => setHouse(nextHouse)}
            />
          ) : undefined
        }
        ring={buildRingData(roomCount, acceptedCount)}
        avatar={
          houseAvatarUrl(house) ? (
            <img
              src={houseAvatarUrl(house)!}
              alt=""
              style={{ width: 112, height: 112, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 28 }}>🏡</span>
          )
        }
        doorplate={{
          langFlag,
          title: house?.title || '',
          description: house?.description,
          roomCount,
          neighborCount: acceptedCount,
          onEdit: () => setShowDoorplate(true),
        }}
        recommended={recommended}
        onApplyNeighbor={handleApplyNeighbor}
        applyLoadingHouseId={applyLoadingHouseId}
        onNeighborClick={(houseId) => router.push(`/houses/${houseId}/yard`)}
        relations={relations}
        relationActingId={relationActingId}
        onAcceptRelation={handleAcceptRelation}
        onRemoveRelation={handleRemoveRelation}
        onOpenRelations={() => router.push('/me/neighbors')}
        neighborFeed={neighborFeed}
        myFeed={myFeed}
        onPostClick={(postId, roomId) =>
          roomId ? router.push(`/rooms/${roomId}`) : router.push(`/posts/${postId}`)
        }
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
        showInterest
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={handleInterest}
        onInterestGoLibrary={() => router.push('/me/library')}
        enableInlineComment
        ownerKey={ownerKey}
      />

      {showShare && house && (
        <ShareModal houseId={house.id} onClose={() => setShowShare(false)} />
      )}
      {showDoorplate && house && ownerKey && (
        <DoorplateEditModal
          houseId={house.id}
          ownerKey={ownerKey}
          title={house.title}
          description={house.description}
          onClose={() => setShowDoorplate(false)}
          onSaved={(h) => setHouse(h)}
        />
      )}
    </div>
  )
}
