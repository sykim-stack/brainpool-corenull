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
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

const VISIBILITY_FILTERS: FilterChip[] = [
  { key: 'all', label: '전체' },
  { key: 'public', label: '공개' },
  { key: 'invite', label: '이웃공개' },
  { key: 'family', label: '비공개' },
]

const STAGE_FILTERS: FilterChip[] = [
  { key: 'all', label: '전체' },
  { key: 'seed', label: '🌱 씨드' },
  { key: 'growth', label: '🌿 성장' },
  { key: 'flower', label: '🌸 꽃' },
]

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
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedVisibility, setSelectedVisibility] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [neighbors, setNeighbors] = useState<NeighborChip[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

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

      fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`)
        .then(r => r.json())
        .then((nb) => {
          const acceptedNeighbors: NeighborChip[] = (nb.data || [])
            .filter((n: any) => n.status === 'accepted' && n.house)
            .map((n: any) => ({
              neighborId: n.id,
              houseId: n.house.id,
              title: n.house.title,
              langFlag: LANG_FLAG[n.house.primary_language] || '🌐',
            }))
          setNeighbors(acceptedNeighbors)
        })

      setLoading(false)
    })
  }, [])

  const filteredRooms = rooms.filter((r) => {
    if (selectedVisibility !== 'all' && r.visibility !== selectedVisibility) return false
    if (selectedStage !== 'all') {
      const { stage } = r.stage ? computeStage(r.stage) : { stage: 'none' }
      if (stage !== selectedStage) return false
    }
    return true
  })

  useEffect(() => {
    if (filteredRooms.length === 0) {
      setSelectedRoomId(null)
      return
    }
    if (!filteredRooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(filteredRooms[0].id)
    }
  }, [selectedVisibility, selectedStage, rooms]) // eslint-disable-line react-hooks/exhaustive-deps

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
          { key: 'home', emoji: '🏠', label: '나의 마당', onClick: () => router.push(`/houses/${house.id}/yard`) },
        ] : []}
      />

      <LivingBlock
        loading={loading}
        background={houseHeroBackground(house, 'living')}
        ring={buildRingData(rooms.length)}
        avatar={
          houseAvatarUrl(house)
            ? <img src={houseAvatarUrl(house)!} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 20 }}>🏡</span>
        }
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
        neighbors={neighbors}
        onNeighborClick={(houseId) => router.push(`/houses/${houseId}/yard`)}
      />
    </div>
  )
}
