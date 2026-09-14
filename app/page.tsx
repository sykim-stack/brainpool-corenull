'use client'

function roomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

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
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'

const COREHUB_URL = 'https://brainpool-corehub.vercel.app/api/corehub/actions'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

const ACTION_LABEL: Record<string, string> = {
  'suggest.corering': '💬 번역 도움이 필요하신가요?',
  'suggest.write': '✍️ 오늘 이야기를 남겨보세요',
  'suggest.invite': '🔗 이웃을 초대해보세요',
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

export default function HomePage() {
  const router = useRouter()
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [posts, setPosts] = useState<PostBlockData[]>([])
  const [neighbors, setNeighbors] = useState<NeighborChip[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ownerKey, setOwnerKey] = useState('')
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [discoveries, setDiscoveries] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!key) return

    ;(async () => {
      const d = await fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json())
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

      // 방마다 최신 1개 (공개 방)
      const publicRooms = roomList.filter((rm: any) => rm.visibility === 'public')
      if (publicRooms.length > 0) {
        const perRoom = await Promise.all(
          publicRooms.map(async (rm: any) => {
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
                house_name: myHouse.title,
                room_name: rm.room_name,
                status: roomStatusLabel(rm),
                stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
              },
            } as PostBlockData
          })
        )
        setPosts(
          perRoom
            .filter((x): x is PostBlockData => !!x)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        )
      }

      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    const key = getDeviceId()
    if (!key) return
    fetch(`${COREHUB_URL}?owner_key=${key}`)
      .then((r) => r.json())
      .then((d) => {
        const items = Array.isArray(d.data) ? d.data : []
        setDiscoveries(
          items.slice(0, 3).map((item: any) => ({
            id: item.id,
            label: ACTION_LABEL[item.action_type] || item.payload?.message || '발견',
          }))
        )
      })
      .catch(() => {})
  }, [])

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

  const getInterestState = (postId: string): 'none' | 'active' | 'ended' => {
    const b = bookmarks.find((bm: any) => bm.message_id === postId)
    if (!b) return 'none'
    return b.ended_at ? 'ended' : 'active'
  }

  const handleInterestClick = async (postId: string) => {
    if (interestLoadingId) return
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
        title="마당"
        actions={
          house
            ? [
                {
                  key: 'home',
                  emoji: '🏠',
                  label: '나의 마당',
                  onClick: () => router.push(`/houses/${house.id}/yard`),
                },
                {
                  key: 'share',
                  emoji: '🔗',
                  label: '참여자 초대',
                  onClick: handleInvite,
                  disabled: inviteLoading,
                },
              ]
            : []
        }
      />

      <YardBlock
        loading={loading}
        background={houseHeroBackground(house, 'yard')}
        ring={buildRingData(rooms.length, neighbors.length)}
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
          neighborCount: neighbors.length,
        }}
        discoveries={discoveries}
        onDiscoveryDismiss={(id) => setDiscoveries((prev) => prev.filter((d) => d.id !== id))}
        recommended={[]}
        neighborFeed={[]}
        myPosts={posts}
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
