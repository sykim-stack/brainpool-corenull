'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import {
  getPostInterestState,
  findInterestBookmark,
  interestPostBody,
  type BookmarkRow as InterestBookmark,
} from '@/lib/interest'
import { pickActiveHouse } from '@/lib/activeHouse'
import TopBar from '@/components/blocks/TopBar'
import LivingBlock from '@/components/blocks/LivingBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { NeighborChip, NeighborRoomSlot } from '@/components/blocks/NeighborContentBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'
import InlineHeroImageControls from '@/components/corenull/InlineHeroImageControls'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function roomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

function buildRingData(roomCount: number): RingData {
  return {
    rings: [
      { index: 0, weight: Math.min(roomCount / 6, 1) },
      { index: 1, weight: 0.4 },
      { index: 2, weight: 0.55 },
    ],
  }
}

function formatSince(iso?: string) {
  if (!iso) return undefined
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 부터`
}

type BookmarkRow = InterestBookmark

export default function LivingPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [corridor, setCorridor] = useState<NeighborChip[]>([])
  const [roomViews, setRoomViews] = useState<PostBlockData[]>([])
  const [roomCount, setRoomCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key)
    if (!key) {
      setLoading(false)
      return
    }

    Promise.all([
      fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json()),
      fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((r) => r.json()),
    ]).then(async ([hData, bData]) => {
      if (bData.data) setBookmarks(bData.data)
      const list = hData.data || []
      const h = pickActiveHouse(list) || list[0]
      if (!h) {
        setLoading(false)
        return
      }
      setHouse(h)

      try {
        const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
        const rooms = rd.data || []
        setRoomCount(rooms.length)

        const slots: NeighborRoomSlot[] = await Promise.all(
          rooms.map(async (rm: any) => {
            const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
            const latest =
              (pd.data || []).find((p: any) => p.type !== 'comment') || (pd.data || [])[0]
            return {
              roomId: rm.id,
              roomName: rm.room_name,
              latestPost: latest
                ? {
                    id: latest.id,
                    content: latest.content,
                    media: latest.meta?.media,
                    created_at: latest.created_at,
                    comment_count: latest.comment_count ?? 0,
                    room_id: rm.id,
                    view_meta: {
                      house_name: h.title,
                      room_name: rm.room_name,
                      status: roomStatusLabel(rm),
                      stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
                      relation: '나',
                    },
                  }
                : null,
            }
          })
        )

        setCorridor([
          {
            neighborId: `living-${h.id}`,
            houseId: h.id,
            title: h.title,
            langFlag: LANG_FLAG[h.primary_language] || '🏡',
            avatarUrl: h.avatar_url || null,
            coverUrl: h.living_image_url || null,
            rooms: slots,
          },
        ])

        const views = slots
          .map((s) => s.latestPost)
          .filter((p): p is PostBlockData => !!p)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setRoomViews(views)
      } catch {
        setCorridor([])
        setRoomViews([])
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const getInterestState = (postId: string, roomId?: string): 'none' | 'active' | 'ended' => {
    return getPostInterestState(bookmarks, postId, roomId)
  }

  const handleInterestClick = async (postId: string, roomId?: string) => {
    if (!ownerKey || interestLoadingId) return
    setInterestLoadingId(postId)
    const existing = findInterestBookmark(bookmarks, postId, roomId)
    if (!existing) {
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interestPostBody(ownerKey, postId, roomId)),
      })
      const data = await res.json()
      if (data.data) setBookmarks((prev) => [...prev, data.data])
      else if (data._error) console.error('[interest]', data._error)
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

  const langFlag = house?.primary_language ? LANG_FLAG[house.primary_language] || '🌐' : '🌐'

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="거실"
        actions={
          house
            ? [
                {
                  key: 'yard',
                  emoji: '🌿',
                  label: '마당',
                  onClick: () => router.push('/yard'),
                },
              ]
            : []
        }
      />

      <LivingBlock
        loading={loading}
        background={houseHeroBackground(house, 'living')}
        heroControls={
          house && ownerKey ? (
            <InlineHeroImageControls
              houseId={house.id}
              ownerKey={ownerKey}
              view="living"
              imageUrl={house.living_image_url}
              position={house.living_image_position}
              onSaved={(nextHouse) => setHouse(nextHouse)}
            />
          ) : undefined
        }
        ring={buildRingData(roomCount)}
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
          since: formatSince(house?.created_at),
          roomCount,
          cta: house
            ? {
                label: '+ 방 만들기',
                onClick: () => router.push('/write?new_room=1'),
              }
            : undefined,
        }}
        corridor={corridor}
        onCorridorHouseClick={() => {}}
        roomViews={roomViews}
        onPostClick={(postId, roomId) =>
          roomId ? router.push(`/rooms/${roomId}`) : router.push(`/posts/${postId}`)
        }
        onCommentClick={(postId) => router.push(`/posts/${postId}`)}
        showInterest
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={handleInterestClick}
        onInterestGoLibrary={() => router.push('/me/library')}
        enableInlineComment
        ownerKey={ownerKey}
      />
    </div>
  )
}
