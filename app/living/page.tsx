'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import { computeStage } from '@/lib/roomStage'
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

// NOTE(2026-08-31): '열매'를 Room 필터에서 뺐다 — 열매는 Room의 상태가
// 아니라 Room 안에 생기는 Message(type='fruit')다. computeStage()가
// 반환하는 stage가 'fruit'인 경우는 있지만(목표일을 지났거나 harvested
// 됐을 때), 그건 "이 방을 지금 찾아볼 이유"라기보다 "다 끝난 방"이라
// 목록 필터 축에서는 굳이 안 보여준다. 필요해지면 언제든 추가 가능.
const STAGE_FILTERS: FilterChip[] = [
  { key: 'all', label: '전체' },
  { key: 'seed', label: '🌱 씨드' },
  { key: 'growth', label: '🌿 성장' },
  { key: 'flower', label: '🌸 꽃' },
]

// NOTE(2026-08-31): 로컬 stage 계산 함수를 지웠다. lib/roomStage.js의
// computeStage()가 이미 정확한 계약(fruit 판정에 harvested OR 목표일
// 초과 둘 다 반영)으로 존재하는데 모르고 새로 짰던 것 — Anchor §7
// 중복 로직 금지 위반이었다. room.stage는 이제 houses API가
// attachRoomStages로 미리 계산해서 내려준다.

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

type BookmarkRow = { id: string; message_id: string | null; ended_at: string | null }

export default function LivingPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([]) // 각 room에 .stage(RoomStage 계약) 포함
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedVisibility, setSelectedVisibility] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)

  // 관심(북마크) — post별 개별 fetch 대신 목록 한 번만 불러와서 매핑.
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

  // 내 house + room 목록 로드 (1인1집, 첫 번째 House 사용)
  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!key) return

    Promise.all([
      fetch(`/api/corenull/houses?owner_key=${key}`).then(r => r.json()),
      fetch(`/api/corenull/bookmarks?owner_key=${key}`).then(r => r.json()),
    ]).then(([d, b]) => {
      const myHouse = d.data?.[0]
      setBookmarks(b.data || [])
      if (!myHouse) {
        setLoading(false)
        return
      }
      setHouse(myHouse)
      setRooms(myHouse.corenull_rooms || [])
      setLoading(false)
    })
  }, [])

  // 두 축(공개범위/성장단계) AND 조합으로 room 목록 필터링.
  // stage 계산은 room.stage(API가 이미 붙여서 내려줌)를 computeStage()에
  // 넣어서 얻는다 — 여기서 다시 계산하지 않는다.
  const filteredRooms = rooms.filter((r) => {
    if (selectedVisibility !== 'all' && r.visibility !== selectedVisibility) return false
    if (selectedStage !== 'all') {
      const { stage } = r.stage ? computeStage(r.stage) : { stage: 'none' }
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
  // 끝났으므로, 여기서는 그 room의 글을 있는 그대로 보여준다.
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

  const roomTabs: RoomTab[] = filteredRooms.map((r) => {
    const computed = r.stage ? computeStage(r.stage) : { emoji: null }
    return {
      id: r.id,
      label: r.room_name,
      badge: computed.emoji || undefined,
    }
  })

  const langFlag = house?.primary_language ? (LANG_FLAG[house.primary_language] || '🌐') : '🌐'

  const handleCreateRoom = () => {
    router.push(`/write?new_room=1`)
  }

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="거실"
        actions={house ? [
          // TODO: 광장 구현되면 다른 화면들처럼 이 자리를 상황에 따라 교체할 수 있음.
          { key: 'home', emoji: '🏠', label: '나의 마당', onClick: () => router.push(`/houses/${house.id}/yard`) },
        ] : []}
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
        onRoomSelect={(roomId) => router.push(`/rooms/${roomId}`)}
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
        showInterest
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={handleInterestClick}
      />
    </div>
  )
}