'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
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
      { index: 1, weight: Math.min(neighborCount / 12, 1) },
      { index: 2, weight: 0.5 },
    ],
  }
}

function formatSince(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 부터`
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
            ? {
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
              }
            : null,
        }
      })
    )
  } catch {
    return []
  }
}

type BookmarkRow = { id: string; message_id?: string | null; room_id?: string | null; ended_at: string | null }

export default function YardPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKeyState] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const [houses, setHouses] = useState<any[]>([])
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [showDoorplateEdit, setShowDoorplateEdit] = useState(false)

  const [recommended, setRecommended] = useState<NeighborChip[]>([])
  const [relations, setRelations] = useState<YardRelationRow[]>([])
  const [neighborFeed, setNeighborFeed] = useState<PostBlockData[]>([])
  const [myPosts, setMyPosts] = useState<PostBlockData[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)
  const [applyLoadingHouseId, setApplyLoadingHouseId] = useState<string | null>(null)
  const [relationActingId, setRelationActingId] = useState<string | null>(null)

  const loadAll = useCallback(async (key: string, preferredHouseId?: string) => {
    setLoading(true)
    try {
      const [hRes, bRes] = await Promise.all([
        fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json()),
        fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((r) => r.json()),
      ])
      if (bRes.data) setBookmarks(bRes.data)

      const list = hRes.data || []
      setHouses(list)
      if (!list.length) {
        setHouse(null)
        setRooms([])
        setRecommended([])
        setRelations([])
        setNeighborFeed([])
        setMyPosts([])
        return
      }

      const active = preferredHouseId
        ? list.find((h: any) => h.id === preferredHouseId) || pickActiveHouse(list)
        : pickActiveHouse(list)
      const h = active || list[0]
      setHouse(h)
      if (h?.id) setActiveHouseId(h.id)

      const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
      setRooms(rd.data || [])

      const [nbRes, discRes] = await Promise.all([
        fetch(`/api/corenull/houses?action=neighbors&house_id=${h.id}`).then((r) => r.json()),
        fetch(`/api/corenull/houses?action=discover&house_id=${h.id}&owner_key=${key}`).then((r) => r.json()),
      ])

      const accepted = (nbRes.data || []).filter((n: any) => n.status === 'accepted')
      const pending = (nbRes.data || []).filter((n: any) => n.status === 'pending')

      const relRows: YardRelationRow[] = (nbRes.data || []).map((n: any) => ({
        id: n.id,
        status: n.status,
        direction: n.direction,
        title: n.house?.title || '이웃',
        houseId: n.house?.id,
        avatarUrl: n.house?.avatar_url || null,
        langFlag: n.house?.primary_language ? LANG_FLAG[n.house.primary_language] || '🌐' : '🌐',
      }))
      setRelations(relRows)

      const pendingTargetIds = new Set(
        pending.filter((n: any) => n.direction === 'outgoing').map((n: any) => n.house?.id).filter(Boolean)
      )

      const discList = discRes.data || []
      const chips: NeighborChip[] = await Promise.all(
        discList.slice(0, 12).map(async (item: any, idx: number) => {
          const hh = item.house || item
          const slots = await loadHouseRoomSlots(hh)
          return {
            neighborId: item.id || hh.id || `disc-${idx}`,
            houseId: hh.id,
            title: hh.title,
            langFlag: LANG_FLAG[hh.primary_language] || '🏡',
            avatarUrl: hh.avatar_url || null,
            coverUrl: hh.yard_image_url || `/alley/alley-0${(idx % 5) + 1}.jpg`,
            rooms: slots,
            requestPending: pendingTargetIds.has(hh.id),
          }
        })
      )
      setRecommended(chips)

      const feedPosts: PostBlockData[] = []
      for (const n of accepted.slice(0, 8)) {
        const hh = n.house
        if (!hh?.id) continue
        const rlist = await fetch(`/api/corenull/rooms?house_id=${hh.id}`).then((r) => r.json())
        for (const rm of (rlist.data || []).filter(isYardVisibleRoom).slice(0, 3)) {
          const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
          const latest = (pd.data || []).find((p: any) => p.type !== 'comment') || (pd.data || [])[0]
          if (!latest) continue
          feedPosts.push({
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
          })
        }
      }
      feedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNeighborFeed(feedPosts.slice(0, 20))

      const mine: PostBlockData[] = []
      for (const rm of (rd.data || []).slice(0, 6)) {
        const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
        const latest = (pd.data || []).find((p: any) => p.type !== 'comment') || (pd.data || [])[0]
        if (!latest) continue
        mine.push({
          id: latest.id,
          content: latest.content,
          media: latest.meta?.media,
          created_at: latest.created_at,
          comment_count: latest.comment_count ?? 0,
          room_id: rm.id,
          view_meta: {
            house_name: h.title,
            room_name: rm.room_name,
            relation: '나',
            status: roomStatusLabel(rm),
          },
        })
      }
      mine.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setMyPosts(mine.slice(0, 3))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKeyState(key || '')
    setOwnerReady(true)
    if (!key) {
      setLoading(false)
      return
    }
    loadAll(key)
  }, [loadAll])

  const handleSwitchHouse = (houseId: string) => {
    setActiveHouseId(houseId)
    loadAll(ownerKey, houseId)
  }

  const handleApplyNeighbor = async (targetHouseId: string) => {
    if (!ownerKey || !house?.id || applyLoadingHouseId) return
    setApplyLoadingHouseId(targetHouseId)
    try {
      await fetch('/api/corenull/houses?action=neighbor-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_house_id: house.id,
          to_house_id: targetHouseId,
          owner_key: ownerKey,
        }),
      })
      await loadAll(ownerKey, house.id)
    } finally {
      setApplyLoadingHouseId(null)
    }
  }

  const handleAcceptRelation = async (neighborId: string) => {
    if (relationActingId) return
    setRelationActingId(neighborId)
    await fetch('/api/corenull/houses?action=neighbor-accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighbor_id: neighborId, owner_key: ownerKey }),
    })
    await loadAll(ownerKey, house?.id)
    setRelationActingId(null)
  }

  const handleRemoveRelation = async (neighborId: string) => {
    if (relationActingId) return
    setRelationActingId(neighborId)
    await fetch(
      `/api/corenull/houses?action=neighbor-remove&neighbor_id=${neighborId}&owner_key=${ownerKey}`,
      { method: 'DELETE' }
    )
    await loadAll(ownerKey, house?.id)
    setRelationActingId(null)
  }

  const getInterestState = (postId: string, roomId?: string): 'none' | 'active' | 'ended' => {
    return getPostInterestState(bookmarks, postId, roomId)
  }

  const handleInterestClick = async (postId: string, roomId?: string) => {
    if (interestLoadingId || !ownerKey) return
    setInterestLoadingId(postId)
    const existing = findInterestBookmark(bookmarks, postId, roomId)
    if (!existing) {
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interestPostBody(ownerKey, postId, roomId)),
      })
      const data = await res.json()
      if (data.data) setBookmarks((prev) => [...prev, data.data])
      else if (data._error) console.error('[interest]', data._error)
    } else {
      const action = existing.ended_at ? 'resume' : 'end'
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, owner_key: ownerKey, action }),
      })
      const data = await res.json()
      if (data.data) {
        setBookmarks((prev) => prev.map((bm) => (bm.id === existing.id ? data.data : bm)))
      }
    }
    setInterestLoadingId(null)
  }

  const handlePostClick = (postId: string, roomId?: string) => {
    if (roomId) router.push(`/rooms/${roomId}`)
    else router.push(`/posts/${postId}`)
  }

  const langFlag = house?.primary_language ? LANG_FLAG[house.primary_language] || '🌐' : '🌐'
  const acceptedCount = relations.filter((r) => r.status === 'accepted').length

  if (ownerReady && !ownerKey) {
    return <OwnerGate />
  }

  if (ownerReady && ownerKey && !loading && !house) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 16 }}>
        <div style={{ fontSize: 40 }}>🏡</div>
        <p style={{ fontSize: 14, color: '#9A8470' }}>아직 집이 없어요</p>
        <button
          onClick={() => router.push('/houses/create')}
          style={{ padding: '10px 24px', background: '#2C1810', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer' }}
        >집 만들기</button>
      </div>
    )
  }

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
              onOpenImages={() => router.push('/me/house')}
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
        onAcceptRelation={handleAcceptRelation}
        onRemoveRelation={handleRemoveRelation}
        relationActingId={relationActingId}
        onOpenRelations={() => router.push('/me/neighbors')}
        neighborFeed={neighborFeed}
        myPosts={myPosts}
        onPostClick={handlePostClick}
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
        showInterest
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={handleInterestClick}
        enableInlineComment
        ownerKey={ownerKey}
        onInterestGoLibrary={() => router.push('/me/library')}
      />

      {showShare && inviteUrl && (
        <ShareModal
          url={inviteUrl}
          title={`${house?.title || '우리 집'} 초대`}
          onClose={() => setShowShare(false)}
        />
      )}

      {showDoorplateEdit && house && ownerKey && (
        <DoorplateEditModal
          houseId={house.id}
          ownerKey={ownerKey}
          title={house.title || ''}
          description={house.description || ''}
          onClose={() => setShowDoorplateEdit(false)}
          onSaved={(next) => {
            setHouse(next)
            setHouses((prev) => prev.map((h) => (h.id === next.id ? { ...h, ...next } : h)))
            setShowDoorplateEdit(false)
          }}
        />
      )}
    </div>
  )
}
