'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

// House.created_at → '2026.03.14 부터' 형식으로 포맷.
function formatSince(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 부터`
}

type BookmarkRow = { id: string; message_id: string | null; ended_at: string | null }

export default function YardPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [neighbors, setNeighbors] = useState<NeighborChip[]>([])
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

  // 이웃 초대 — 지금은 house 멤버(참여자) 초대 링크 생성. Neighbor(ADR-ACCESS-002)
  // 요청/수락 흐름과는 별개 기능이다 — 라벨이 같아 헷갈릴 수 있어 남겨두지만
  // 나중에 "참여자 초대"로 문구를 분리하는 걸 검토할 것.
  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

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

  // `/yard`는 dynamic segment가 없는 최상위 라우트라 useParams()로는
  // houseId를 얻을 수 없다 (기존 known bug). 1인1집 원칙에 따라
  // living/page.tsx와 동일하게 owner_key로 내 house를 조회해서 얻는다.
  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!key) return

    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then(r => r.json())
      .then(async (d) => {
        const myHouse = d.data?.[0]
        if (!myHouse) {
          setLoading(false)
          return
        }
        setHouse(myHouse)

        const [r, b, nb] = await Promise.all([
          fetch(`/api/corenull/rooms?house_id=${myHouse.id}`).then(res => res.json()),
          fetch(`/api/corenull/bookmarks?owner_key=${key}`).then(res => res.json()),
          fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`).then(res => res.json()),
        ])

        const roomList = r.data || []
        setRooms(roomList)
        setBookmarks(b.data || [])

        // 골목엔 accepted 관계만 보여준다 (ADR-ACCESS-002 §1-2).
        // "참여자"(house 멤버) 수가 아니라 실제 Neighbor 관계 수를 쓴다.
        const acceptedNeighbors: NeighborChip[] = (nb.data || [])
          .filter((n: any) => n.status === 'accepted' && n.house)
          .map((n: any) => ({
            neighborId: n.id,
            houseId: n.house.id,
            title: n.house.title,
            langFlag: LANG_FLAG[n.house.primary_language] || '🌐',
          }))
        setNeighbors(acceptedNeighbors)

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
              view_meta: myHouse.title ? { house_name: myHouse.title } : undefined,
            }))
          setPosts(merged)
        }

        setLoading(false)
      })
  }, [])

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

  const langFlag = house?.primary_language ? (LANG_FLAG[house.primary_language] || '🌐') : '🌐'

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당"
        actions={house ? [
          { key: 'home', emoji: '🏠', label: '나의 마당', onClick: () => router.push(`/houses/${house.id}/yard`) },
          { key: 'share', emoji: '🔗', label: '참여자 초대', onClick: handleInvite, disabled: inviteLoading },
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
          since: house?.created_at ? formatSince(house.created_at) : undefined,
          roomCount: rooms.length,
          neighborCount: neighbors.length,
        }}
        posts={posts}
        onPostClick={(postId) => router.push(`/posts/${postId}`)}
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
        showInterest
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={handleInterestClick}
        neighbors={neighbors}
        onNeighborClick={(houseId) => router.push(`/houses/${houseId}/yard`)}
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