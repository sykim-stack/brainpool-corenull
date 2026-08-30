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
// 계약(ADR-RINGBLOCK-000: rings:[{index,weight}])만 지키면 되므로,
// 이 함수만 교체하면 HeroBlock/RingBlock/YardBlock 전부 그대로 유지된다.
function buildRingData(roomCount: number, neighborCount: number): RingData {
  const rings = [
    { index: 0, weight: Math.min(roomCount / 6, 1) },
    { index: 1, weight: Math.min(neighborCount / 12, 1) },
    { index: 2, weight: 0.5 },
  ]
  return { rings }
}

export default function HouseYardPage() {
  const { houseId } = useParams()
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!houseId) return

    Promise.all([
      fetch(`/api/corenull/houses?house_id=${houseId}`).then(r => r.json()),
      fetch(`/api/corenull/rooms?house_id=${houseId}`).then(r => r.json()),
    ]).then(async ([h, r]) => {
      setHouse(h.house || null)
      const roomList = r.data || []
      setRooms(roomList)

      // 내 방 최신 콘텐츠 — 공개 방들 기준으로 최신 post 모아오기.
      // room마다 개별 fetch하지 않고, room_id 목록으로 한 번에 조회
      // (예전 yard 페이지의 N+1 문제를 반복하지 않기 위함).
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
        ring={buildRingData(rooms.length, 0)}
        avatar={<span style={{ fontSize: 20 }}>🏡</span>}
        doorplate={{
          langFlag,
          title: house?.title || '',
          description: house?.description,
          roomCount: rooms.length,
        }}
        posts={posts}
        onPostClick={(postId) => router.push(`/posts/${postId}`)}
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
      />
    </div>
  )
}