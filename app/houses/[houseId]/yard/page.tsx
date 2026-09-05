'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import YardBlock from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

// Ring weight 임시 계산 — 나중에 CoreHub 가중치로 교체될 자리.
function buildRingData(roomCount: number, neighborCount: number): RingData {
  const rings = [
    { index: 0, weight: Math.min(roomCount / 6, 1) },
    { index: 1, weight: Math.min(neighborCount / 12, 1) },
    { index: 2, weight: 0.5 },
  ]
  return { rings }
}

type BookmarkRow = { id: string; message_id: string | null; ended_at: string | null }

// ADR-ACCESS-002 §1-1 — 방문 중인 house와 내 house 사이의 관계 상태.
// 'self'는 내가 내 house를 이 URL로 봤을 때(엣지케이스), CTA 없음.
type NeighborRelation =
  | { kind: 'none' }
  | { kind: 'self' }
  | { kind: 'pending_outgoing'; neighborId: string }
  | { kind: 'pending_incoming'; neighborId: string }
  | { kind: 'accepted'; neighborId: string }

export default function HouseYardPage() {
  const { houseId } = useParams()
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [myHouseId, setMyHouseId] = useState<string | null>(null)
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [neighbors, setNeighbors] = useState<NeighborChip[]>([])
  const [relation, setRelation] = useState<NeighborRelation>({ kind: 'none' })
  const [relationLoading, setRelationLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

  // 참여자 초대 — HouseClient.tsx의 기존 handleInvite/ShareModal 로직 재사용.
  // API/토큰 로직은 그대로, owner일 때만 노출되도록 게이트만 추가한다.
  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const isOwner = house?.owner_key === ownerKey

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

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!houseId) return

    Promise.all([
      fetch(`/api/corenull/houses?house_id=${houseId}`).then(r => r.json()),
      fetch(`/api/corenull/rooms?house_id=${houseId}`).then(r => r.json()),
      key ? fetch(`/api/corenull/bookmarks?owner_key=${key}`).then(r => r.json()) : Promise.resolve({ data: [] }),
      fetch(`/api/corenull/houses?action=neighbors&house_id=${houseId}`).then(r => r.json()),
      key ? fetch(`/api/corenull/houses?owner_key=${key}`).then(r => r.json()) : Promise.resolve({ data: [] }),
    ]).then(async ([h, r, b, nb, myHouses]) => {
      setHouse(h.house || null)
      const roomList = r.data || []
      setRooms(roomList)
      setBookmarks(b.data || [])

      // 이 집의 골목 — accepted 관계만 (ADR-ACCESS-002 §1-2)
      const acceptedNeighbors: NeighborChip[] = (nb.data || [])
        .filter((n: any) => n.status === 'accepted' && n.house)
        .map((n: any) => ({
          neighborId: n.id,
          houseId: n.house.id,
          title: n.house.title,
          langFlag: LANG_FLAG[n.house.primary_language] || '🌐',
        }))
      setNeighbors(acceptedNeighbors)

      // 나와 이 집의 관계 판단 — 내 house 기준 neighbors 목록에서 찾는다.
      const myHouse = myHouses.data?.[0]
      if (myHouse) {
        setMyHouseId(myHouse.id)
        if (myHouse.id === houseId) {
          setRelation({ kind: 'self' })
        } else {
          const mine = await fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`).then(res => res.json())
          const match = (mine.data || []).find((n: any) => n.house?.id === houseId)
          if (!match) {
            setRelation({ kind: 'none' })
          } else if (match.status === 'accepted') {
            setRelation({ kind: 'accepted', neighborId: match.id })
          } else if (match.direction === 'outgoing') {
            setRelation({ kind: 'pending_outgoing', neighborId: match.id })
          } else {
            setRelation({ kind: 'pending_incoming', neighborId: match.id })
          }
        }
      }

      const publicRoomIds = roomList.filter((rm: any) => rm.visibility === 'public').map((rm: any) => rm.id)
      if (publicRoomIds.length > 0) {
        const postResults = await Promise.all(
          publicRoomIds.map((rid: string) =>
            fetch(`/api/corenull/posts?room_id=${rid}`).then(res => res.json())
          )
        )
        const merged = postResults
          .flatMap((res) => res.data || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map((p: any): PostBlockData => ({
            id: p.id,
            content: p.content,
            media: p.meta?.media,
            created_at: p.created_at,
            comment_count: p.comment_count ?? 0,
          }))
        setPosts(merged)
      }

      setLoading(false)
    })
  }, [houseId])

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

  // 이웃 신청하기
  const handleNeighborRequest = async () => {
    if (relationLoading || !myHouseId) return
    setRelationLoading(true)
    const res = await fetch('/api/corenull/houses?action=neighbor-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_a_id: myHouseId, owner_key: ownerKey, house_b_id: houseId }),
    })
    const data = await res.json()
    if (data.data) {
      setRelation({ kind: 'pending_outgoing', neighborId: data.data.id })
    }
    setRelationLoading(false)
  }

  // 받은 요청 수락하기
  const handleNeighborAccept = async () => {
    if (relationLoading || relation.kind !== 'pending_incoming') return
    setRelationLoading(true)
    const res = await fetch('/api/corenull/houses?action=neighbor-accept', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighbor_id: relation.neighborId, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data) {
      setRelation({ kind: 'accepted', neighborId: relation.neighborId })
    }
    setRelationLoading(false)
  }

  // HeroDoorplate은 CTA 슬롯이 하나뿐 — 상태별로 이 하나만 갈아끼운다.
  // 거절/취소/해지는 여기서 안 하고 /me/neighbors 관리 화면에서 처리한다.
  const relationCta = (() => {
    switch (relation.kind) {
      case 'none':
        return { label: relationLoading ? '...' : '🏘️ 이웃 신청하기', onClick: handleNeighborRequest, disabled: relationLoading }
      case 'pending_outgoing':
        return { label: '요청 보냄', onClick: () => {}, disabled: true }
      case 'pending_incoming':
        return { label: relationLoading ? '...' : '🤝 이웃 요청 수락하기', onClick: handleNeighborAccept, disabled: relationLoading }
      case 'accepted':
        return { label: '🏘️ 이웃이에요', onClick: () => {}, disabled: true }
      case 'self':
      default:
        return undefined
    }
  })()

  const langFlag = house?.primary_language ? (LANG_FLAG[house.primary_language] || '🌐') : '🌐'

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당"
        actions={isOwner ? [
          {
            key: 'share',
            emoji: '🔗',
            label: inviteLoading ? '초대 링크 생성 중...' : '참여자 초대',
            onClick: handleInvite,
            disabled: inviteLoading,
          },
        ] : []}
      />

      <YardBlock
        loading={loading}
        background={{ gradient: undefined }}
        ring={buildRingData(rooms.length, neighbors.length)}
        avatar={<span style={{ fontSize: 20 }}>🏡</span>}
        doorplate={{
          langFlag,
          title: house?.title || '',
          description: house?.description,
          roomCount: rooms.length,
          neighborCount: neighbors.length,
          cta: relationCta,
        }}
        posts={posts}
        onPostClick={(postId) => router.push(`/posts/${postId}`)}
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
        showInterest
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={handleInterestClick}
        neighbors={neighbors}
        onNeighborClick={(hId) => router.push(`/houses/${hId}/yard`)}
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