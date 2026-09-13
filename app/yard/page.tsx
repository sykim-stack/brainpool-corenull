'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { YardRelationRow } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function isYardVisibleRoom(rm: any) {
  return rm.visibility === 'public' || rm.visibility === 'invite'
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

async function loadHouseRoomSlots(h: any): Promise<NeighborChip['rooms']> {
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
                view_meta: { room_name: rm.room_name, house_name: h.title },
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

  const [ownerKey, setOwnerKey] = useState('')
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
        return slots.map((s) => s?.latestPost).filter(Boolean).map((p) => p as PostBlockData)
      })
    )
    setNeighborFeed(
      feedChunks
        .flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12)
    )

    const myVisible = roomList.filter(isYardVisibleRoom).map((rm: any) => rm.id)
    if (myVisible.length > 0) {
      const postResults = await Promise.all(
        myVisible.map((rid: string) =>
          fetch(`/api/corenull/posts?room_id=${rid}`).then((res) => res.json())
        )
      )
      setMyPosts(
        postResults
          .flatMap((res) => res.data || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map(
            (p: any): PostBlockData => ({
              id: p.id,
              content: p.content,
              media: p.meta?.media,
              created_at: p.created_at,
              comment_count: p.comment_count ?? 0,
              view_meta: myHouse.title ? { house_name: myHouse.title } : undefined,
            })
          )
      )
    } else {
      setMyPosts([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!key) return
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

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당"
        actions={
          house
            ? [
                {
                  key: 'home',
                  emoji: '🏠',
                  label: '나의 마당',
                  onClick: () => router.push(`/houses/${house.id}/yard`),
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
