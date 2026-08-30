'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import LivingBlock, { RoomTab, FilterChip } from '@/components/blocks/LivingBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

const FILTERS: FilterChip[] = [
  { key: 'all', label: '전체' },
  { key: 'public', label: '공개' },
  { key: 'seed', label: '🌱 씨앗' },
  { key: 'fruit', label: '🍎 열매' },
]

// Ring weight — YardBlock과 동일한 임시 계산. 계약만 지키면 되므로
// 이 함수만 나중에 CoreHub 가중치로 교체해도 LivingBlock/HeroBlock은 안 바뀐다.
function buildRingData(roomCount: number): RingData {
  return {
    rings: [
      { index: 0, weight: Math.min(roomCount / 6, 1) },
      { index: 1, weight: 0.4 },
      { index: 2, weight: 0.6 },
    ],
  }
}

export default function LivingPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)

  // 내 house + room 목록 로드 (1인1집, 첫 번째 House 사용)
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

        const roomList = myHouse.corenull_rooms || []
        setRooms(roomList)
        if (roomList.length > 0) setSelectedRoomId(roomList[0].id)
        setLoading(false)
      })
  }, [])

  // 선택된 room의 post 목록 로드 (room 전환/필터 변경 시)
  useEffect(() => {
    if (!selectedRoomId) return
    setPostsLoading(true)
    fetch(`/api/corenull/posts?room_id=${selectedRoomId}`)
      .then(r => r.json())
      .then((d) => {
        let list = d.data || []

        // 필터는 room의 seed_mode/visibility, message의 type 조합으로
        // 판단 — 정확한 매핑은 이 페이지(조립부) 책임, LivingBlock은 모름.
        const room = rooms.find((r) => r.id === selectedRoomId)
        if (selectedFilter === 'public') {
          list = room?.visibility === 'public' ? list : []
        } else if (selectedFilter === 'seed') {
          list = room?.seed_mode ? list.filter((p: any) => p.type === 'post') : []
        } else if (selectedFilter === 'fruit') {
          list = list.filter((p: any) => p.type === 'fruit')
        }

        setPosts(
          list.map((p: any): PostBlockData => ({
            id: p.id,
            content: p.content,
            media: p.meta?.media,
            created_at: p.created_at,
            comment_count: p.comment_count ?? 0,
          }))
        )
        setPostsLoading(false)
      })
  }, [selectedRoomId, selectedFilter, rooms])

  const roomTabs: RoomTab[] = rooms.map((r) => ({
    id: r.id,
    label: r.room_name,
    badge: r.seed_mode ? '🌱' : undefined,
  }))

  const langFlag = house?.primary_language ? (LANG_FLAG[house.primary_language] || '🌐') : '🌐'

  const handleCreateRoom = () => {
    router.push(`/write?new_room=1`)
  }

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="거실"
      />

      <LivingBlock
        loading={loading}
        background={{ gradient: 'linear-gradient(135deg, #5C4A35 0%, #8A6F52 60%, #D8C4A8 100%)' }}
        ring={buildRingData(rooms.length)}
        avatar={<span style={{ fontSize: 20 }}>🏡</span>}
        doorplate={{
          langFlag,
          title: house?.title || '',
          description: house?.description,
          roomCount: rooms.length,
        }}
        rooms={roomTabs}
        selectedRoomId={selectedRoomId}
        onRoomSelect={setSelectedRoomId}
        onCreateRoomClick={handleCreateRoom}
        filters={FILTERS}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        posts={postsLoading ? [] : posts}
        onPostClick={(postId) => router.push(`/posts/${postId}`)}
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
      />
    </div>
  )
}