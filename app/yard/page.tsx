'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { YardRelationRow } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import OwnerGate from '@/components/corenull/OwnerGate'
import InlineHeroImageControls from '@/components/corenull/InlineHeroImageControls'
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

type BookmarkRow = { id: string; message_id: string | null; ended_at: string | null }

export default function YardPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKeyState] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [recommended, setRecommended] = useState<NeighborChip[]>([])
  const [relations, setRelations] = useState<YardRelationRow[]>([])
  const [neighborFeed, setNeighborFeed] = useState<PostBlockData[]>([])
  const [myPosts, setMyPosts] = useState<PostBlockData[]>([])

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)
  const [applyLoadingHouseId, setApplyLoadingHouseId] = useState<string | null>(null)
  const [relationActingId, setRelationActingId] = useState<string | null>(null)

  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const acceptedCount = relations.filter((r) => r.status === 'accepted').length

  const handleInvite = async () => {
    if (inviteLoading || !house) return
    setInviteLoading(true)
    const res = await fetch('/api/corenull/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_id: house.id, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data?.invite_token) {
      setInviteUrl(`https://corenull.vercel.app/invite/${data.data.invite_token}`)
      setShowShare(true)
    }
    setInviteLoading(false)
  }

  const loadAll = useCallback(async (key: string) => {
    const d = await fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json())
    const myHouse = d.data?.[0]
    if (!myHouse) {
      setLoading(false)
      return
    }
    setHouse(myHouse)

    const [r, b, nb, disc] = await Promise.all([
      fetch(`/api/corenull/rooms?house_id=${myHouse.id}`).then((res) => res.json()),
      fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((res) => res.json()),
      fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`).then((res) => res.json()),
      fetch(`/api/corenull/houses?action=discover&house_id=${myHouse.id}`).then((res) => res.json()),
    ])

    const roomList = r.data || []
    setRooms(roomList)
    setBookmarks(b.data || [])

    const nbRows = nb.data || []
    setRelations(
      nbRows
        .filter((n: any) => n.house)
        .map((n: any) => ({
          id: n.id,
          status: n.status,
          direction: n.direction,
          title: n.house.title,
          houseId: n.house.id,
          avatarUrl: n.house.avatar_url || null,
          langFlag: LANG_FLAG[n.house.primary_language] || undefined,
        }))
    )

    const pendingTargetIds = new Set(
      nbRows.filter((n: any) => n.status === 'pending' && n.house).map((n: any) => n.house.id)
    )
    const discHouses = disc.data || []
    const rec: NeighborChip[] = await Promise.all(
      discHouses.map(async (h: any) => {
        const roomSlots = await loadHouseRoomSlots(h)
        return {
          neighborId: `discover-${h.id}`,
          houseId: h.id,
          title: h.title,
          langFlag: LANG_FLAG[h.primary_language] || '🌐',
          avatarUrl: h.avatar_url || null,
          coverUrl: h.yard_image_url || null,
          rooms: roomSlots,
          requestPending: pendingTargetIds.has(h.id),
        }
      })
    )
    setRecommended(rec)

    const accepted = nbRows.filter((n: any) => n.status === 'accepted' && n.house)
    const feedChunks = await Promise.all(
      accepted.map(async (n: any) => {
        const slots = await loadHouseRoomSlots(n.house)
        return (slots ?? []).map((s) => s?.latestPost).filter((p): p is PostBlockData => !!p)
      })
    )
    setNeighborFeed(
      feedChunks
        .flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12)
    )

    const myRooms = roomList.filter(isYardVisibleRoom)
    if (myRooms.length > 0) {
      const perRoom = await Promise.all(
        myRooms.map(async (rm: any) => {
          const res = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
          const latest = (res.data || [])[0]
          if (!latest) return null
          return {
            id: latest.id,
            content: latest.content,
            media: latest.meta?.media,
            created_at: latest.created_at,
            comment_count: latest.comment_count ?? 0,
            room_id: rm.id,
            view_meta: {
              house_name: myHouse.title,
              room_name: rm.room_name,
              status: roomStatusLabel(rm),
              stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
            },
          } as PostBlockData
        })
      )
      setMyPosts(
        perRoom
          .filter((p): p is PostBlockData => !!p)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      )
    } else {
      setMyPosts([])
    }

    setLoading(false)
  }, [])

  // Owner 확인 후 House 조회. Owner 없으면 House를 만들지 않는다.
  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKeyState(key)
    setOwnerReady(true)
    if (!key) {
      setLoading(false)
      return
    }
    loadAll(key)
  }, [loadAll])

  const handleApplyNeighbor = async (targetHouseId: string) => {
    if (!house || !ownerKey || applyLoadingHouseId) return
    setApplyLoadingHouseId(targetHouseId)
    const res = await fetch('/api/corenull/houses?action=neighbor-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_a_id: house.id, owner_key: ownerKey, house_b_id: targetHouseId }),
    })
    const data = await res.json()
    if (data.data) {
      setRecommended((prev) =>
        prev.map((x) => (x.houseId === targetHouseId ? { ...x, requestPending: true } : x))
      )
      await loadAll(ownerKey)
    }
    setApplyLoadingHouseId(null)
  }

  const handleAcceptRelation = async (neighborId: string) => {
    if (relationActingId) return
    setRelationActingId(neighborId)
    await fetch('/api/corenull/houses?action=neighbor-accept', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighbor_id: neighborId, owner_key: ownerKey }),
    })
    await loadAll(ownerKey)
    setRelationActingId(null)
  }

  const handleRemoveRelation = async (neighborId: string) => {
    if (relationActingId) return
    setRelationActingId(neighborId)
    await fetch(
      `/api/corenull/houses?action=neighbor-remove&neighbor_id=${neighborId}&owner_key=${ownerKey}`,
      { method: 'DELETE' }
    )
    await loadAll(ownerKey)
    setRelationActingId(null)
  }

  const getInterestState = (postId: string): 'none' | 'active' | 'ended' => {
    const b = bookmarks.find((bm) => bm.message_id === postId)
    if (!b) return 'none'
    return b.ended_at ? 'ended' : 'active'
  }

  const handleInterestClick = async (postId: string) => {
    if (interestLoadingId) return
    setInterestLoadingId(postId)
    const existing = bookmarks.find((bm) => bm.message_id === postId)
    if (!existing) {
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_key: ownerKey, message_id: postId }),
      })
      const data = await res.json()
      if (data.data) setBookmarks((prev) => [...prev, data.data])
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

  // Owner 미확인 → 게이트 (빈 집 생성 금지)
  if (ownerReady && !ownerKey) {
    return <OwnerGate />
  }

  // Owner는 있으나 House 없음 → 집 만들기 유도
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
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당"
        actions={
          house
            ? [
                {
                  key: 'plaza',
                  emoji: '🏛️',
                  label: '광장',
                  onClick: () => router.push('/plaza'),
                },
                {
                  key: 'share',
                  emoji: '🔗',
                  label: '참여자 초대',
                  onClick: handleInvite,
                  disabled: inviteLoading,
                },
              ]
            : []
        }
      />

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
        ring={buildRingData(rooms.length, acceptedCount)}
        avatar={
          houseAvatarUrl(house) ? (
            <img
              src={houseAvatarUrl(house)!}
              alt=""
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
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
    </div>
  )
}
