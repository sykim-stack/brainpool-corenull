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

const VISIBILITY_FILTERS: FilterChip[] = [
  { key: 'all', label: '전체' },
  { key: 'public', label: '공개' },
  { key: 'invite', label: '이웃공개' },
  { key: 'family', label: '비공개' },
]

// NOTE(2026-08-31 정정): '열매'를 여기서 뺐다. 열매는 Room의 상태가
// 아니라 Room 안에 생기는 Message(type='fruit')다 — Room 자체를
// "열매 단계"로 필터링하는 건 범주 오류였다(구버전 getRoomStage가
// 존재하지도 않는 room.harvested_at을 참조하던 버그가 그 증거).
// 열매 여부는 방을 열어서 그 안의 글에 🍎 뱃지로 이미 표시된다.
const STAGE_FILTERS: FilterChip[] = [
  { key: 'all', label: '전체' },
  { key: 'seed', label: '🌱 씨드중' },
  { key: 'flower', label: '🌸 꽃' },
]

// Room의 성장단계 — 오직 room 자체 컬럼(seed_mode, bloom_date,
// created_at)만으로 계산한다. Message를 조회하지 않는다(N+1 방지,
// 그리고 애초에 Room 필터가 Message 상태를 알 필요가 없다).
//   seed_mode off       → 필터 대상 아님(일반 방)
//   seed_mode on, 목표일 없음(성장형) → 'seed'로 취급(진행률 개념 없음)
//   seed_mode on, 목표일 있음(목표형) → 시간 진행률로 seed/flower 판정
function getRoomStage(room: any): 'none' | 'seed' | 'flower' {
  if (!room.seed_mode) return 'none'
  if (!room.bloom_date) return 'seed' // 성장형은 고정 씨드/성장 취급, 꽃 개념 없음

  const created = new Date(room.created_at).getTime()
  const target = new Date(room.bloom_date).getTime()
  const now = Date.now()
  if (now >= target) return 'flower'
  return 'seed'
}

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
  const [selectedVisibility, setSelectedVisibility] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')
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
        setLoading(false)
      })
  }, [])

  // 두 축(공개범위/성장단계) AND 조합으로 room 목록 필터링.
  // 각 축은 서로 완전히 독립 — 이 조립부에서만 조합한다.
  const filteredRooms = rooms.filter((r) => {
    if (selectedVisibility !== 'all' && r.visibility !== selectedVisibility) return false
    if (selectedStage !== 'all') {
      const stage = getRoomStage(r)
      if (stage !== selectedStage) return false
    }
    return true
  })

  // 필터링된 목록 안에 지금 선택된 room이 없으면(필터 바뀌어서 빠졌으면)
  // 첫 번째 room으로 자동 이동. 필터링된 목록이 비면 선택 해제.
  useEffect(() => {
    if (filteredRooms.length === 0) {
      setSelectedRoomId(null)
      return
    }
    if (!filteredRooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(filteredRooms[0].id)
    }
  }, [selectedVisibility, selectedStage, rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 room의 post 목록 로드. 필터는 room 선택 단계에서 이미
  // 끝났으므로, 여기서는 그 room의 글을 있는 그대로 보여준다 —
  // 열매(fruit)도 이 목록에 섞여서 나오고 PostBlock이 알아서
  // 🍎 뱃지로 구분해 보여준다(view_meta.stage_emoji).
  useEffect(() => {
    if (!selectedRoomId) {
      setPosts([])
      return
    }
    setPostsLoading(true)
    fetch(`/api/corenull/posts?room_id=${selectedRoomId}`)
      .then(r => r.json())
      .then((d) => {
        const list = d.data || []
        setPosts(
          list.map((p: any): PostBlockData => ({
            id: p.id,
            content: p.content,
            media: p.meta?.media,
            created_at: p.created_at,
            comment_count: p.comment_count ?? 0,
            view_meta: p.type === 'fruit' ? { stage_emoji: '🍎' } : undefined,
          }))
        )
        setPostsLoading(false)
      })
  }, [selectedRoomId])

  const roomTabs: RoomTab[] = filteredRooms.map((r) => ({
    id: r.id,
    label: r.room_name,
    badge: r.seed_mode ? (getRoomStage(r) === 'flower' ? '🌸' : '🌱') : undefined,
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
        visibilityFilters={VISIBILITY_FILTERS}
        selectedVisibility={selectedVisibility}
        onVisibilityChange={setSelectedVisibility}
        stageFilters={STAGE_FILTERS}
        selectedStage={selectedStage}
        onStageChange={setSelectedStage}
        posts={postsLoading ? [] : posts}
        onPostClick={(postId) => router.push(`/posts/${postId}`)}
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
      />
    </div>
  )
}