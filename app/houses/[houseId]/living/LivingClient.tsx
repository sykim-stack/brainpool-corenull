'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

type RelationState =
  | { kind: 'self' }
  | { kind: 'none' }
  | { kind: 'accepted'; neighborId: string }
  | { kind: 'pending_outgoing'; neighborId: string }
  | { kind: 'pending_incoming'; neighborId: string }

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
      { index: 1, weight: 0.45 },
      { index: 2, weight: 0.5 },
    ],
  }
}

function formatSince(iso?: string) {
  if (!iso) return undefined
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 부터`
}

type BookmarkRow = {
  id: string
  message_id: string | null
  room_id?: string | null
  ended_at: string | null
}

export default function LivingClient() {
  const { houseId } = useParams<{ houseId: string }>()
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [relation, setRelation] = useState<RelationState>({ kind: 'none' })
  const [posters, setPosters] = useState<PosterData[]>([])
  const [roomViews, setRoomViews] = useState<PostBlockData[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null)

  const canEnterLiving = relation.kind === 'self' || relation.kind === 'accepted'
  const isOwner = relation.kind === 'self'

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key || '')
    if (!houseId) return

    ;(async () => {
      setLoading(true)
      try {
        const [hRes, rRes, bRes, myHousesRes] = await Promise.all([
          fetch(`/api/corenull/houses?house_id=${houseId}`).then((r) => r.json()),
          fetch(`/api/corenull/rooms?house_id=${houseId}`).then((r) => r.json()),
          key
            ? fetch(`/api/corenull/bookmarks?owner_key=${key}`).then((r) => r.json())
            : Promise.resolve({ data: [] }),
          key
            ? fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json())
            : Promise.resolve({ data: [] }),
        ])

        const h = hRes.house || null
        setHouse(h)
        setBookmarks(bRes.data || [])

        const myHouse = myHousesRes.house || myHousesRes.data?.[0]
        let rel: RelationState = { kind: 'none' }
        if (myHouse && h) {
          if (myHouse.id === houseId) {
            rel = { kind: 'self' }
          } else {
            const mine = await fetch(
              `/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`
            ).then((r) => r.json())
            const match = (mine.data || []).find((n: any) => n.house?.id === houseId)
            if (!match) rel = { kind: 'none' }
            else if (match.status === 'accepted')
              rel = { kind: 'accepted', neighborId: match.id }
            else if (match.direction === 'outgoing')
              rel = { kind: 'pending_outgoing', neighborId: match.id }
            else rel = { kind: 'pending_incoming', neighborId: match.id }
          }
        }
        setRelation(rel)

        const allowed = rel.kind === 'self' || rel.kind === 'accepted'
        if (!allowed || !h) {
          setPosters([])
          setRoomViews([])
          setLoading(false)
          return
        }

        const roomList = rRes.data || []
        const list =
          rel.kind === 'self'
            ? roomList
            : roomList.filter(
                (rm: any) => rm.visibility === 'public' || rm.visibility === 'invite'
              )

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
                    relation: rel.kind === 'self' ? '나' : '이웃',
                  },
                }
              : null

            return { poster, view, visibility: rm.visibility }
          })
        )

        setPosters(slots.map((s) => s.poster))
        const views = slots
          .filter((s) => s.view && (s.visibility === 'public' || s.visibility === 'invite'))
          .map((s) => s.view!)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
        setRoomViews(views)
      } finally {
        setLoading(false)
      }
    })()
  }, [houseId])

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

  const getPosterInterestActive = (roomId: string) => {
    const bm = bookmarks.find((b) => b.room_id === roomId && !b.message_id)
    return !!(bm && !bm.ended_at)
  }

  const handlePosterInterest = async (roomId: string) => {
    if (!ownerKey) return
    const existing = bookmarks.find((b) => b.room_id === roomId && !b.message_id)
    if (!existing) {
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_key: ownerKey, room_id: roomId }),
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
  }

  const langFlag = house?.primary_language ? LANG_FLAG[house.primary_language] || '🌐' : '🌐'

  if (!loading && !canEnterLiving) {
    return (
      <div>
        <TopBar
          logo={<CoreNullLogo size="sm" />}
          title="거실"
          actions={[
            {
              key: 'yard',
              emoji: '🌿',
              label: '마당',
              onClick: () => router.push(`/houses/${houseId}/yard`),
            },
          ]}
        />
        <div style={gateStyles.box}>
          <div style={gateStyles.emoji}>🛋️</div>
          <p style={gateStyles.title}>이웃만 거실에 들어올 수 있어요</p>
          <p style={gateStyles.desc}>
            {relation.kind === 'pending_outgoing'
              ? '이웃 신청 중이에요. 수락되면 거실을 볼 수 있어요.'
              : relation.kind === 'pending_incoming'
                ? '상대가 신청한 이웃이에요. 마당에서 수락해 주세요.'
                : '마당에서 이웃이 된 뒤에 거실을 볼 수 있어요.'}
          </p>
          <button
            type="button"
            style={gateStyles.btn}
            onClick={() => router.push(`/houses/${houseId}/yard`)}
          >
            마당으로 가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title={isOwner ? '거실' : house?.title ? `${house.title} 거실` : '거실'}
        actions={[
          {
            key: 'yard',
            emoji: '🌿',
            label: '마당',
            onClick: () => router.push(`/houses/${houseId}/yard`),
          },
        ]}
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
          cta: isOwner
            ? { label: '집 꾸미기', onClick: () => router.push('/me/house') }
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
        onInterestGoLibrary={() => router.push('/library')}
        showPosterInterest={!isOwner}
        getPosterInterestActive={getPosterInterestActive}
        onPosterInterestClick={handlePosterInterest}
        enableInlineComment
        ownerKey={ownerKey}
        onCreateRoomClick={isOwner ? () => router.push('/write?new_room=1') : undefined}
      />
    </div>
  )
}

const gateStyles: Record<string, React.CSSProperties> = {
  box: {
    margin: '48px 24px',
    padding: '32px 20px',
    textAlign: 'center',
    background: '#FEFCF8',
    borderRadius: 16,
    border: '1px solid rgba(92,61,46,0.12)',
  },
  emoji: { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 600, color: '#2C1810', margin: '0 0 8px' },
  desc: { fontSize: 13, color: '#9A8470', margin: '0 0 20px', lineHeight: 1.6 },
  btn: {
    border: 'none',
    background: '#2C1810',
    color: '#FEFCF8',
    padding: '10px 18px',
    borderRadius: 12,
    fontSize: 13,
    cursor: 'pointer',
  },
}
