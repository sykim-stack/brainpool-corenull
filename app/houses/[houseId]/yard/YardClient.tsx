'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { DiscoveryItem, YardRelationRow } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { NeighborChip, NeighborRoomSlot } from '@/components/blocks/NeighborContentBlock'
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function roomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

function isYardVisibleRoom(rm: any) {
  return rm.visibility === 'public' || rm.visibility === 'invite'
}

const COREHUB_URL = 'https://brainpool-corehub.vercel.app/api/corehub/opportunities'
const ACTION_LABEL: Record<string, string> = {
  'trigger.hajunai.nudge': '🌱 씨앗이 기다리고 있어요',
  'trigger.hajunai.celebrate': '🍎 씨앗이 열매가 됐어요',
  'suggest.corering': '💬 번역 도움이 필요하신가요?',
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

async function loadHouseRoomSlots(h: { id: string; title?: string }): Promise<NeighborRoomSlot[]> {
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

type RelationState =
  | { kind: 'self' }
  | { kind: 'none' }
  | { kind: 'accepted'; neighborId: string }
  | { kind: 'pending_outgoing'; neighborId: string }
  | { kind: 'pending_incoming'; neighborId: string }

export default function YardClient() {
  const { houseId } = useParams<{ houseId: string }>()
  const router = useRouter()

  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [publicPosts, setPublicPosts] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)
  const [ownerKey, setOwnerKey] = useState('')
  const [myHouseId, setMyHouseId] = useState<string | null>(null)
  const [relation, setRelation] = useState<RelationState>({ kind: 'none' })
  const [relations, setRelations] = useState<YardRelationRow[]>([])
  const [alleyNeighbors, setAlleyNeighbors] = useState<NeighborChip[]>([])
  const [neighborCount, setNeighborCount] = useState(0)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>([])
  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [relationActing, setRelationActing] = useState(false)

  const isOwner = relation.kind === 'self'
  const isVisitor = !isOwner

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key || '')

    Promise.all([
      fetch(`/api/corenull/houses?house_id=${houseId}`).then((r) => r.json()),
      fetch(`/api/corenull/rooms?house_id=${houseId}`).then((r) => r.json()),
      key
        ? fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((r) => r.json())
        : Promise.resolve({ data: [] }),
      fetch(`/api/corenull/houses?action=neighbors&house_id=${houseId}`).then((r) => r.json()),
      key
        ? fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json())
        : Promise.resolve({ data: [] }),
    ]).then(async ([h, r, b, nb, myHouses]) => {
      setHouse(h.house || null)
      const roomList = r.data || []
      setRooms(roomList)
      setBookmarks(b.data || [])

      const nbRows = nb.data || []
      const acceptedRows = nbRows.filter((n: any) => n.status === 'accepted' && n.house)
      setNeighborCount(acceptedRows.length)

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

      // 골목 = 이 집의 accepted 이웃 (방문·소유 공통, 허전하지 않게 방 슬롯 포함)
      const alley: NeighborChip[] = await Promise.all(
        acceptedRows.map(async (n: any) => {
          const roomSlots = await loadHouseRoomSlots(n.house)
          return {
            neighborId: n.id,
            houseId: n.house.id,
            title: n.house.title,
            langFlag: LANG_FLAG[n.house.primary_language] || '🌐',
            avatarUrl: n.house.avatar_url || null,
            coverUrl: n.house.yard_image_url || null,
            rooms: roomSlots,
          }
        })
      )
      setAlleyNeighbors(alley)

      const myHouse = myHouses.data?.[0]
      if (myHouse) {
        setMyHouseId(myHouse.id)
        if (myHouse.id === houseId) {
          setRelation({ kind: 'self' })
        } else {
          const mine = await fetch(
            `/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`
          ).then((res) => res.json())
          const match = (mine.data || []).find((n: any) => n.house?.id === houseId)
          if (!match) setRelation({ kind: 'none' })
          else if (match.status === 'accepted')
            setRelation({ kind: 'accepted', neighborId: match.id })
          else if (match.direction === 'outgoing')
            setRelation({ kind: 'pending_outgoing', neighborId: match.id })
          else setRelation({ kind: 'pending_incoming', neighborId: match.id })
        }
      }

      const visibleRooms = roomList.filter(isYardVisibleRoom)
      if (visibleRooms.length > 0) {
        const perRoom = await Promise.all(
          visibleRooms.map(async (rm: any) => {
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
                house_name: h.house?.title,
                room_name: rm.room_name,
                status: roomStatusLabel(rm),
                stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
              },
            } as PostBlockData
          })
        )
        setPublicPosts(
          perRoom
            .filter((x): x is PostBlockData => !!x)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        )
      } else {
        setPublicPosts([])
      }

      setLoading(false)
    })
  }, [houseId])

  useEffect(() => {
    if (!isOwner) return
    const key = getDeviceId()
    if (!key) return
    fetch(`${COREHUB_URL}?owner_key=${key}`)
      .then((r) => r.json())
      .then((d) => {
        const items = Array.isArray(d.data) ? d.data : []
        const mapped: DiscoveryItem[] = items.slice(0, 3).map((item: any) => ({
          id: item.id,
          label:
            ACTION_LABEL[item.action_type] ||
            item.payload?.message ||
            '발견',
        }))
        setDiscoveries(mapped)
      })
      .catch(() => {})
  }, [isOwner])

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

  const handleNeighborRequest = async () => {
    if (relationActing || !myHouseId || !houseId) return
    setRelationActing(true)
    const res = await fetch('/api/corenull/houses?action=neighbor-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        house_a_id: myHouseId,
        owner_key: ownerKey,
        house_b_id: houseId,
      }),
    })
    const data = await res.json()
    if (data.data) {
      setRelation({ kind: 'pending_outgoing', neighborId: data.data.id })
    }
    setRelationActing(false)
  }

  const handleNeighborAccept = async () => {
    if (relationActing || relation.kind !== 'pending_incoming') return
    setRelationActing(true)
    const res = await fetch('/api/corenull/houses?action=neighbor-accept', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighbor_id: relation.neighborId, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data) {
      setRelation({ kind: 'accepted', neighborId: relation.neighborId })
    }
    setRelationActing(false)
  }

  const relationCta = (() => {
    if (isOwner) return undefined
    switch (relation.kind) {
      case 'none':
        return {
          label: relationActing ? '…' : '🏘️ 이웃 신청하기',
          onClick: handleNeighborRequest,
          disabled: relationActing || !myHouseId,
        }
      case 'pending_outgoing':
        return { label: '요청 보냄', onClick: () => {}, disabled: true }
      case 'pending_incoming':
        return {
          label: relationActing ? '…' : '🤝 이웃 요청 수락하기',
          onClick: handleNeighborAccept,
          disabled: relationActing,
        }
      case 'accepted':
        return { label: '🏘️ 이웃이에요', onClick: () => {}, disabled: true }
      default:
        return undefined
    }
  })()

  const getInterestState = (postId: string): 'none' | 'active' | 'ended' => {
    const b = bookmarks.find((bm: any) => bm.message_id === postId)
    if (!b) return 'none'
    return b.ended_at ? 'ended' : 'active'
  }

  const handleInterestClick = async (postId: string) => {
    if (interestLoadingId || !ownerKey) return
    setInterestLoadingId(postId)
    const existing = bookmarks.find((bm: any) => bm.message_id === postId)
    if (!existing) {
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_key: ownerKey, message_id: postId }),
      })
      const data = await res.json()
      if (data.data) setBookmarks((prev: any[]) => [...prev, data.data])
    } else {
      const action = existing.ended_at ? 'resume' : 'end'
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, owner_key: ownerKey, action }),
      })
      const data = await res.json()
      if (data.data) {
        setBookmarks((prev: any[]) => prev.map((bm) => (bm.id === existing.id ? data.data : bm)))
      }
    }
    setInterestLoadingId(null)
  }

  const langFlag = house?.primary_language ? LANG_FLAG[house.primary_language] || '🌐' : '🌐'

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title={house?.title || '마당'}
        actions={[
          {
            key: 'my-yard',
            emoji: '🏠',
            label: '나의 마당',
            onClick: () => router.push('/yard'),
          },
          ...((relation.kind === 'self' || relation.kind === 'accepted')
            ? [{
                key: 'living',
                emoji: '🛋️',
                label: '거실',
                onClick: () => router.push(`/houses/${houseId}/living`),
              }]
            : []),
          ...(isOwner
            ? [{
                key: 'share',
                emoji: '🔗',
                label: '참여자 초대',
                onClick: handleInvite,
                disabled: inviteLoading,
              }]
            : []),
        ]}
      />

      <YardBlock
        loading={loading}
        visitorMode={isVisitor}
        background={houseHeroBackground(house, 'yard')}
        ring={buildRingData(rooms.length, neighborCount)}
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
          neighborCount,
          cta: relationCta,
        }}
        discoveries={isOwner ? discoveries : []}
        onDiscoveryDismiss={(id) => setDiscoveries((prev) => prev.filter((d) => d.id !== id))}
        recommended={alleyNeighbors}
        onRecommendHouseClick={(hId) => router.push(`/houses/${hId}/yard`)}
        onAcceptedNeighborClick={(hId) => router.push(`/houses/${hId}/living`)}
        relations={relations}
        publicPosts={publicPosts}
        myPosts={isOwner ? publicPosts : []}
        onPostClick={(postId, roomId) => {
          if (roomId) router.push(`/rooms/${roomId}`)
          else router.push(`/posts/${postId}`)
        }}
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
