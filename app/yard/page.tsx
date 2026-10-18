'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import {
  getPostInterestState,
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

async function loadHouseRoomSlots(h: any): Promise<NeighborRoomSlot[]> {
  try {
    const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
    const list = (rd.data || []).filter(isYardVisibleRoom).slice(0, 6)
    return Promise.all(
      list.map(async (rm: any) => {
        try {
          const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
          const latest = (pd.data || []).find((x: any) => x.type !== 'comment') || (pd.data || [])[0]
          return {
            roomId: rm.id,
            roomName: rm.room_name,
            statusLabel: roomStatusLabel(rm),
            latestPost: latest
              ? {
                  id: latest.id,
                  content: latest.content,
                  media: latest.meta?.media,
                  created_at: latest.created_at,
                  comment_count: latest.comment_count ?? 0,
                }
              : null,
          } as NeighborRoomSlot
        } catch {
          return { roomId: rm.id, roomName: rm.room_name, statusLabel: roomStatusLabel(rm), latestPost: null }
        }
      }),
    )
  } catch {
    return []
  }
}

export default function YardPage() {
  const router = useRouter()
  const [ownerKey, setOwnerKey] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key)
    setOwnerReady(true)
  }, [])

  const reload = useCallback(async (key: string, preferredHouseId?: string | null) => {
    setLoading(true)
    try {
      const [hRes, bmRes] = await Promise.all([
        fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json()),
        fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((r) => r.json()).catch(() => ({ data: [] })),
      ])
      const list = hRes.data || []
      setHouses(list)
      setBookmarks(bmRes.data || [])
      const active = preferredHouseId
        ? list.find((h: any) => h.id === preferredHouseId) || pickActiveHouse(list)
        : pickActiveHouse(list)
      if (!active) {
        setHouse(null)
        setLoading(false)
        return
      }
      setActiveHouseId(active.id)
      setHouse(active)

      const [roomsRes, nbRes, discRes] = await Promise.all([
        fetch(`/api/corenull/rooms?house_id=${active.id}`).then((r) => r.json()),
        fetch(`/api/corenull/houses?action=neighbors&house_id=${active.id}`).then((r) => r.json()),
        fetch(`/api/corenull/houses?action=discover&owner_key=${key}`).then((r) => r.json()).catch(() => ({ data: [] })),
      ])

      const myRooms = roomsRes.data || []
      setRooms(myRooms)
      const neighbors = nbRes.data || []
      const accepted = neighbors.filter((n: any) => n.status === 'accepted')
      const pending = neighbors.filter((n: any) => n.status === 'pending')

      setRelations(
        neighbors.map((n: any) => ({
          id: n.id,
          status: n.status,
          direction: n.direction,
          title: n.house?.title || '집',
          houseId: n.house?.id,
          avatarUrl: n.house?.avatar_url || null,
          langFlag: LANG_FLAG[n.house?.primary_language] || '🏡',
        })),
      )

      const pendingTargetIds = new Set(
        pending.filter((n: any) => n.direction === 'outgoing').map((n: any) => n.house?.id).filter(Boolean),
      )
      const discoverList = (discRes.data || []).slice(0, 8)
      const acceptedSlice = accepted.slice(0, 8).filter((n: any) => n.house?.id)

      const chips = await Promise.all(
        discoverList.map(async (hh: any, idx: number) => {
          const slots = await loadHouseRoomSlots(hh)
          return {
            neighborId: hh.id,
            houseId: hh.id,
            title: hh.title || '집',
            langFlag: LANG_FLAG[hh.primary_language] || '🏡',
            avatarUrl: hh.avatar_url || null,
            coverUrl: hh.yard_image_url || `/alley/alley-0${(idx % 5) + 1}.jpg`,
            rooms: slots,
            requestPending: pendingTargetIds.has(hh.id),
          } as NeighborChip
        }),
      )
      setRecommended(chips)

      const feedNested = await Promise.all(
        acceptedSlice.map(async (n: any) => {
          const hh = n.house
          try {
            const rlist = await fetch(`/api/corenull/rooms?house_id=${hh.id}`).then((r) => r.json())
            const roomsList = (rlist.data || []).filter(isYardVisibleRoom).slice(0, 3)
            const posts = await Promise.all(
              roomsList.map(async (rm: any) => {
                const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
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
                    status: roomStatusLabel(rm),
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
      setNeighborFeed(feedNested.flat().slice(0, 20))

      // 내 방 최신: 방당 최신 1 · brick 3-2-3-2-3 / 2-1-2-1-2 (상한 40방)
      const mineNested = await Promise.all(
        myRooms.slice(0, 40).map(async (rm: any) => {
          try {
            const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
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
                house_name: (active as any).title,
                room_name: rm.room_name,
                status: roomStatusLabel(rm),
              },
            } as PostBlockData
          } catch {
            return null
          }
        }),
      )
      setMyPosts(mineNested.filter(Boolean) as PostBlockData[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ownerKey) return
    reload(ownerKey)
  }, [ownerKey, reload])

  const handleSwitchHouse = (id: string) => {
    setActiveHouseId(id)
    reload(ownerKey, id)
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
      await reload(ownerKey, house.id)
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

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="마당" />
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
          title: house?.title || '',
          description: house?.description,
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
