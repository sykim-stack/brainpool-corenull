'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import YardBlock from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'

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

export default function HouseYardPage() {
  const { houseId } = useParams()
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [neighborCount, setNeighborCount] = useState(0)
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)

  // 관심(북마크) — post별로 개별 fetch하지 않고 목록 한 번만 불러와서
  // message_id 기준으로 매핑. 예전 yard 페이지의 N+1 문제를 반복하지 않는다.
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!houseId) return

    Promise.all([
      fetch(`/api/corenull/houses?house_id=${houseId}`).then(r => r.json()),
      fetch(`/api/corenull/rooms?house_id=${houseId}`).then(r => r.json()),
      key ? fetch(`/api/corenull/bookmarks?owner_key=${key}`).then(r => r.json()) : Promise.resolve({ data: [] }),
      // 이웃 수 — house 전체 멤버(room_id IS NULL)만 센다. room 한정
      // 참여자는 "이웃"이 아니라 "참여자"라 여기 포함하지 않는다.
      fetch(`/api/corenull/members?house_id=${houseId}`).then(r => r.json()),
    ]).then(async ([h, r, b, m]) => {
      setHouse(h.house || null)
      const roomList = r.data || []
      setRooms(roomList)
      setBookmarks(b.data || [])
      const memberRows = m.data || []
      setNeighborCount(memberRows.filter((row: any) => row.room_id === null).length)

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

  const langFlag = house?.primary_language ? (LANG_FLAG[house.primary_language] || '🌐') : '🌐'

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당"
        actions={[
          { key: 'share', emoji: '🔗', label: '이웃 초대', onClick: () => {/* TODO: invite 연결 */} },
        ]}
      />

      <YardBlock
        loading={loading}
        background={{ gradient: undefined }}
        ring={buildRingData(rooms.length, neighborCount)}
        avatar={<span style={{ fontSize: 20 }}>🏡</span>}
        doorplate={{
          langFlag,
          title: house?.title || '',
          description: house?.description,
          since: house?.created_at ? formatSince(house.created_at) : undefined,
          roomCount: rooms.length,
          neighborCount,
        }}
        posts={posts}
        onPostClick={(postId) => router.push(`/posts/${postId}`)}
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
        showInterest
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={handleInterestClick}
      />
    </div>
  )
}