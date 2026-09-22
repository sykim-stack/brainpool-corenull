'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import LivingBlock from '@/components/blocks/LivingBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { PosterData } from '@/components/blocks/PosterBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { houseHeroBackground, houseAvatarUrl } from '@/lib/houseImages'

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

function isLivingVisibleRoom(rm: any, isOwnHouse: boolean) {
  if (isOwnHouse) return true
  return rm.visibility === 'public' || rm.visibility === 'invite'
}

type BookmarkRow = { id: string; message_id: string | null; ended_at: string | null }

export default function LivingPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [posters, setPosters] = useState<PosterData[]>([])
  const [roomViews, setRoomViews] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!key) return

    Promise.all([
      fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json()),
      fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((r) => r.json()),
    ]).then(async ([hData, bData]) => {
      if (bData.data) setBookmarks(bData.data)
      const h = hData.house || hData.data?.[0]
      if (!h) {
        setLoading(false)
        return
      }
      setHouse(h)

      try {
        const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
        const list = (rd.data || []).filter((rm: any) => isLivingVisibleRoom(rm, true))

        const slots = await Promise.all(
          list.map(async (rm: any) => {
            const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
            const latest =
              (pd.data || []).find((p: any) => p.type !== 'comment') || (pd.data || [])[0]
            const media = latest?.meta?.media
            const imageUrl =
              media?.find((m: any) => m.type === 'image')?.url || media?.[0]?.url || null

            const poster: PosterData = {
              roomId: rm.id,
              roomName: rm.room_name,
              status: roomStatusLabel(rm),
              stageEmoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : null,
              recentContent: latest?.content || null,
              imageUrl,
              media: Array.isArray(media) ? media : undefined,
              createdAt: latest?.created_at || null,
              houseName: h.title,
            }

            const view: PostBlockData | null = latest
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
              : null

            return { poster, view }
          })
        )

        setPosters(slots.map((s) => s.poster))
        // 본인 거실: 전체 방 최신 — 상한 없음(화면만 6·스와이프)
        const views = slots
          .filter((s) => s.view)
          .map((s) => s.view!)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setRoomViews(views)
      } catch {
        setPosters([])
        setRoomViews([])
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const getInterestState = (postId: string): 'none' | 'active' | 'ended' => {
    const bm = bookmarks.find((b) => b.message_id === postId)
    if (!bm) return 'none'
    return bm.ended_at ? 'ended' : 'active'
  }

  const handleInterestClick = async (postId: string) => {
    if (!ownerKey) return
    setInterestLoadingId(postId)
    const existing = bookmarks.find((b) => b.message_id === postId)
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
                  onClick: () => router.push(`/houses/${house.id}/yard`),
                },
              ]
            : []
        }
      />

      <LivingBlock
        loading={loading}
        background={houseHeroBackground(house, 'living')}
        ring={buildRingData(posters.length)}
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
          roomCount: posters.length,
          cta: house
            ? {
                label: '집 꾸미기',
                onClick: () => router.push('/me/house'),
              }
            : undefined,
        }}
        posters={posters}
        onPosterClick={(roomId) => router.push(`/rooms/${roomId}`)}
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
        onCreateRoomClick={() => router.push('/write?new_room=1')}
      />
    </div>
  )
}
