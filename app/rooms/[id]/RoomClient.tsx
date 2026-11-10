'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getOwnerKey } from '@/lib/ownerKey'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import RoomSettingsModal from '@/components/corenull/RoomSettingsModal'
import PostBlock, { PostBlockData } from '@/components/blocks/PostBlock'
import MyContentBlock from '@/components/blocks/MyContentBlock'

type Room = {
  id: string
  room_name: string
  visibility: 'public' | 'invite' | 'private'
  seed_mode: boolean
  bloom_date: string | null
  slug: string | null
  house_id: string
  created_at: string
  cover_image_url?: string | null
  cover_image_position?: { x?: number; y?: number; scale?: number } | null
}

type House = {
  id: string
  title: string
  primary_language: string
  owner_key: string
}

type Post = {
  id: string
  content: string
  type: string
  created_at: string
  owner_key: string
  meta?: { media?: any; archived?: boolean; deleted?: boolean; pinned?: boolean }
  comment_count?: number
}

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function getCountdown(bloomDate: string | null) {
  if (!bloomDate) return null
  const end = new Date(bloomDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return { bloomed: true, label: '꽃이 피었어요' }
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return { bloomed: false, label: `개화까지 ${days}일` }
}

export default function RoomClient() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()

  const [room, setRoom] = useState<Room | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [ownerKey, setOwnerKey] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'block'>('list')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('corenull_room_view')
      if (saved === 'list' || saved === 'block') setViewMode(saved)
    } catch {}
  }, [])

  const setViewModePersist = (mode: 'list' | 'block') => {
    setViewMode(mode)
    try { localStorage.setItem('corenull_room_view', mode) } catch {}
  }

  const isOwner = house?.owner_key === ownerKey
  const canWrite = isOwner || isMember
  const countdown = room?.seed_mode ? getCountdown(room.bloom_date) : null

  useEffect(() => {
    if (!roomId) return
    const ownerKey = getOwnerKey()
    setOwnerKey(ownerKey)
    fetchRoom(ownerKey)
  }, [roomId])

  async function fetchRoom(ownerKey: string) {
    setLoading(true)
    setError(null)
    try {
      const rRes = await fetch(`/api/corenull/rooms?room_id=${roomId}&owner_key=${ownerKey}`)
      const rData = await rRes.json()
      if (rData._error || !rData.room) {
        setError(rData._error === 'ACCESS_DENIED' ? '이 방을 볼 수 없어요' : (rData._error || '방을 찾을 수 없어요'))
        setLoading(false)
        return
      }
      setRoom(rData.room)
      let houseData = rData.house || null
      if (!houseData?.owner_key && rData.room.house_id) {
        try {
          const hRes = await fetch(`/api/corenull/houses?house_id=${rData.room.house_id}`).then((r) => r.json())
          houseData = hRes.house || hRes.data || houseData
        } catch { /* ignore */ }
      }
      setHouse(houseData)

      if (rData.room.house_id) {
        const deviceId = getDeviceId()
        if (ownerKey) {
          const mRes = await fetch(
            `/api/corenull/members?house_id=${rData.room.house_id}&device_id=${encodeURIComponent(deviceId || ownerKey)}&owner_key=${encodeURIComponent(ownerKey)}&room_id=${roomId}`
          )
          const mData = await mRes.json()
          const members = mData.data || []
          setIsMember(members.some((m: any) => m.owner_key === ownerKey || m.device_id === deviceId))
        }
      }

      const pRes = await fetch(`/api/corenull/posts?room_id=${roomId}&owner_key=${ownerKey}`)
      const pData = await pRes.json()
      setPosts((pData.data || []).filter((p: Post) => p.type === 'post' && !p.meta?.deleted && !p.meta?.archived))
    } catch (e) {
      setError('불러오지 못했어요')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '12px' }}>
        <div style={{ fontSize: 28 }}>📖</div>
        <div style={{ color: '#9A8470', fontSize: 14 }}>불러오는 중…</div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <p style={{ color: '#9A8470', marginBottom: 16 }}>{error || '방을 찾을 수 없어요'}</p>
        <button style={btnSecondary} onClick={() => router.push('/yard')}>마당으로</button>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title={room.room_name}
        shareUrl={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      <div style={metaStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {house && (
            <button type="button" style={metaHouseBtn} onClick={() => router.push(`/houses/${house.id}/living`)}>
              🏡 {house.title}
            </button>
          )}
          {house?.primary_language && (
            <span style={{ fontSize: 12 }}>{LANG_FLAG[house.primary_language] || ''}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canWrite && (
            <Link href={`/write?room_id=${roomId}`} style={writeBtnStyle}>글쓰기</Link>
          )}
          <button type="button" style={iconBtn} onClick={() => setShowShare(true)} aria-label="공유">🔗</button>
          {isOwner && (
            <button type="button" style={iconBtn} onClick={() => setShowSettings(true)} aria-label="설정">⚙️</button>
          )}
        </div>
      </div>

      {room.cover_image_url && (
        <div
          className="bleed-full"
          style={{
            height: 180,
            width: '100vw',
            marginLeft: 'calc(50% - 50vw)',
            backgroundImage: `url(${room.cover_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: `${room.cover_image_position?.x ?? 50}% ${room.cover_image_position?.y ?? 50}%`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15,25,20,0.05) 0%, rgba(15,25,20,0.35) 100%)',
            }}
          />
        </div>
      )}

      {countdown && (
        <div style={{
          ...countdownBanner,
          borderColor: countdown.bloomed ? 'rgba(74,124,63,0.3)' : 'rgba(193,127,60,0.3)',
          background: countdown.bloomed ? 'rgba(74,124,63,0.08)' : '#fef3e2',
          color: countdown.bloomed ? '#4A7C3F' : '#C17F3C',
        }}>
          <span>{countdown.bloomed ? '🌸' : '🌱'}</span>
          <span>{countdown.label}</span>
          {room.bloom_date && (
            <span style={{ fontSize: 11, color: '#9A8470', marginTop: 2 }}>
              {new Date(room.bloom_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
        </div>
      )}

      <main style={{ padding: viewMode === 'block' ? '8px 0 16px' : '16px' }}>
        {posts.length > 0 && (
          <div style={viewToggleRow}>
            <span style={viewToggleLabel}>보기</span>
            <div style={viewToggleGroup}>
              <button
                type="button"
                style={{ ...viewToggleBtn, ...(viewMode === 'list' ? viewToggleBtnActive : {}) }}
                onClick={() => setViewModePersist('list')}
              >
                리스트
              </button>
              <button
                type="button"
                style={{ ...viewToggleBtn, ...(viewMode === 'block' ? viewToggleBtnActive : {}) }}
                onClick={() => setViewModePersist('block')}
              >
                블록
              </button>
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <EmptyState isOwner={canWrite} roomId={roomId} />
        ) : viewMode === 'block' ? (
          <MyContentBlock
            title=""
            layout="brick"
            posts={posts.map((post) => ({
              id: post.id,
              content: post.content || '',
              media: (post.meta?.media as any) || undefined,
              created_at: post.created_at,
              comment_count: (post as any).comment_count ?? 0,
              room_id: roomId,
              pinned: !!post.meta?.pinned,
              view_meta: {
                house_name: house?.title,
                room_name: room.room_name,
              },
            }))}
            emptyLabel="아직 이야기가 없어요"
            onPostClick={(id) => router.push(`/posts/${id}`)}
            enableInlineComment
            ownerKey={ownerKey}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posts.map((post) => (
              <PostBlock
                key={post.id}
                post={{
                  id: post.id,
                  content: post.content || '',
                  media: (post.meta?.media as any) || undefined,
                  created_at: post.created_at,
                  comment_count: (post as any).comment_count ?? 0,
                  room_id: roomId,
                  pinned: !!post.meta?.pinned,
                }}
                onClick={() => router.push(`/posts/${post.id}`)}
                enableInlineComment
                ownerKey={ownerKey}
              />
            ))}
          </div>
        )}
      </main>

      {showShare && (
        <ShareModal
          onClose={() => setShowShare(false)}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={room.room_name}
        />
      )}

      {showSettings && room && house && (
        <RoomSettingsModal
          roomId={room.id}
          houseId={house.id}
          roomName={room.room_name}
          visibility={room.visibility}
          seedMode={!!room.seed_mode}
          ownerKey={ownerKey}
          isOwner={isOwner}
          coverImageUrl={room.cover_image_url}
          onClose={() => setShowSettings(false)}
          onUpdate={(u) => {
            setRoom((r) => r ? {
              ...r,
              room_name: u.room_name,
              visibility: u.visibility,
              seed_mode: u.seed_mode ?? r.seed_mode,
              cover_image_url: u.cover_image_url !== undefined ? u.cover_image_url : r.cover_image_url,
            } : r)
          }}
        />
      )}
    </div>
  )
}

function EmptyState({ isOwner, roomId }: { isOwner: boolean; roomId: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#9A8470' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
      <p style={{ fontSize: 14, marginBottom: 16 }}>아직 이야기가 없어요</p>
      {isOwner && (
        <Link href={`/write?room_id=${roomId}`} style={writeBtnStyle}>첫 글 쓰기</Link>
      )}
    </div>
  )
}

const metaStrip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 16px', gap: 8,
  borderBottom: '1px solid rgba(92,61,46,0.08)', background: '#FEFCF8',
}
const metaHouseBtn: React.CSSProperties = {
  border: 'none', background: 'transparent', cursor: 'pointer',
  fontSize: 13, color: '#5C3D2E', fontWeight: 500, padding: 0,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
}
const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(92,61,46,0.12)',
  background: '#FEFCF8', cursor: 'pointer', fontSize: 16,
}
const writeBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px 14px', borderRadius: 10, background: '#2C1810', color: '#FEFCF8',
  fontSize: 13, fontWeight: 600, textDecoration: 'none', border: 'none', cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(92,61,46,0.2)',
  background: '#FEFCF8', color: '#5C3D2E', cursor: 'pointer', fontSize: 13,
}
const countdownBanner: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, margin: '12px 16px',
  padding: '12px 14px', borderRadius: 12, border: '1px solid',
  background: '#fef3e2', color: '#C17F3C', fontWeight: 600,
}

const viewToggleRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
  gap: 8, marginBottom: 12,
}
const viewToggleLabel: React.CSSProperties = { fontSize: 12, color: '#9A8470', marginRight: 4 }
const viewToggleGroup: React.CSSProperties = {
  display: 'inline-flex', borderRadius: 10, border: '1px solid rgba(92,61,46,0.12)', overflow: 'hidden',
}
const viewToggleBtn: React.CSSProperties = {
  border: 'none', background: '#FEFCF8', color: '#9A8470', fontSize: 12,
  padding: '6px 12px', cursor: 'pointer',
}
const viewToggleBtnActive: React.CSSProperties = {
  background: '#2C1810', color: '#FEFCF8',
}
