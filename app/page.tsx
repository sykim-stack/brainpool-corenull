'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { DiscoveryItem } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
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

type BookmarkRow = { id: string; message_id: string | null; ended_at: string | null }

export default function HomePage() {
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [neighbors, setNeighbors] = useState<NeighborChip[]>([])
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>([])
  const [loading, setLoading] = useState(true)

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

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

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!key) return

    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then((r) => r.json())
      .then(async (d) => {
        const myHouse = d.data?.[0]
        if (!myHouse) {
          setLoading(false)
          return
        }
        setHouse(myHouse)

        const [r, b, nb] = await Promise.all([
          fetch(`/api/corenull/rooms?house_id=${myHouse.id}`).then((res) => res.json()),
          fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((res) => res.json()),
          fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`).then((res) =>
            res.json()
          ),
        ])

        const roomList = r.data || []
        setRooms(roomList)
        setBookmarks(b.data || [])

        const acceptedNeighbors: NeighborChip[] = (nb.data || [])
          .filter((n: any) => n.status === 'accepted' && n.house)
          .map((n: any) => ({
            neighborId: n.id,
            houseId: n.house.id,
            title: n.house.title,
            langFlag: LANG_FLAG[n.house.primary_language] || '🌐',
          }))
        setNeighbors(acceptedNeighbors)

        const publicRoomIds = roomList
          .filter((rm: any) => rm.visibility === 'public')
          .map((rm: any) => rm.id)
        if (publicRoomIds.length > 0) {
          const postResults = await Promise.all(
            publicRoomIds.map((rid: string) =>
              fetch(`/api/corenull/posts?room_id=${rid}`).then((res) => res.json())
            )
          )
          const merged = postResults
            .flatMap((res) => res.data || [])
            .sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .slice(0, 10)
            .map(
              (p: any): PostBlockData => ({
                id: p.id,
                content: p.content,
                media: p.meta?.media,
                created_at: p.created_at,
                comment_count: p.comment_count ?? 0,
              })
            )
          setPosts(merged)
        }

        setLoading(false)
      })
  }, [])

  useEffect(() => {
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
            '새로운 연결을 발견했어요',
        }))
        setDiscoveries(mapped)
      })
      .catch(() => null)
  }, [])

  const handleDiscoveryDismiss = (id: string) => {
    setDiscoveries((prev) => prev.filter((d) => d.id !== id))
    fetch(COREHUB_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: id, outcome: 'shown' }),
    }).catch(() => null)
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

  const langFlag = house?.primary_language
    ? LANG_FLAG[house.primary_language] || '🌐'
    : '🌐'

  if (!loading && !house) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '70vh',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 40 }}>🏡</div>
        <p style={{ fontSize: 14, color: '#9A8470' }}>아직 집이 없어요</p>
        <button
          onClick={() => router.push('/houses/create')}
          style={{
            padding: '10px 24px',
            background: '#2C1810',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          집 만들기
        </button>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당"
        actions={[
          { key: 'plaza', emoji: '🏛️', label: '광장', onClick: () => router.push('/plaza') },
          {
            key: 'share',
            emoji: '🔗',
            label: inviteLoading ? '초대 링크 생성 중...' : '참여자 초대',
            onClick: handleInvite,
            disabled: inviteLoading,
          },
        ]}
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
        discoveries={discoveries}
        onDiscoveryDismiss={handleDiscoveryDismiss}
        recommended={[]}
        neighborFeed={[]}
        myPosts={posts}
        onPostClick={(postId) => router.push(`/posts/${postId}`)}
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
