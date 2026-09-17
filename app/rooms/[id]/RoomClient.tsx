'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import RoomSettingsModal from '@/components/corenull/RoomSettingsModal'
import PostBlock from '@/components/blocks/PostBlock'

type Room = {
  id: string
  room_name: string
  visibility: 'public' | 'invite' | 'private'
  seed_mode: boolean
  bloom_date: string | null
  slug: string | null
  house_id: string
  created_at: string
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
  meta: {
    title?: string
    image_url?: string
    video_url?: string
    archived?: boolean
    language?: string
    media?: { type: string; url: string }[]
  }
  relations: Record<string, unknown>
  created_at: string
  owner_key: string
}

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function getCountdown(bloomDate: string): { label: string; bloomed: boolean } {
  const now = new Date()
  const bloom = new Date(bloomDate)
  bloom.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((bloom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return { label: '🌸 꽃이 피었어요!', bloomed: true }
  if (diff === 1) return { label: '🌱 내일 꽃이 피어요', bloomed: false }
  return { label: `🌱 꽃까지 ${diff}일`, bloomed: false }
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [ownerKey, setOwnerKey] = useState('')

  const isOwner = house?.owner_key === ownerKey
  const canWrite = isOwner || isMember

  const goToLiving = () => {
    if (house?.id) router.push(`/houses/${house.id}/living`)
    else router.push('/living')
  }

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!roomId) return
    fetchRoom(key)
  }, [roomId])

  async function fetchRoom(key: string) {
    setLoading(true)
    setError(null)
    try {
      const rRes = await fetch(`/api/corenull/rooms?room_id=${roomId}`)
      const rData = await rRes.json()
      if (rData._error || !rData.room) {
        setError('방을 찾을 수 없어요.')
        setLoading(false)
        return
      }
      setRoom(rData.room)

      const hRes = await fetch(`/api/corenull/houses?house_id=${rData.room.house_id}`)
      const hData = await hRes.json()
      if (!hData._error && hData.house) {
        setHouse(hData.house)
        const mRes = await fetch(`/api/corenull/members?house_id=${rData.room.house_id}&device_id=${key}&room_id=${roomId}`)
        const mData = await mRes.json()
        setIsMember(!mData._error && mData.is_member === true)
      }

      const pRes = await fetch(`/api/corenull/posts?room_id=${roomId}&owner_key=${key}`)
      const pData = await pRes.json()
      if (!pData._error && pData.data) {
        setPosts(pData.data.filter((p: Post) => !p.meta?.archived))
      }
    } catch {
      setError('불러오는 중 문제가 생겼어요.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <p style={{ color: '#9A8470', fontSize: '14px' }}>불러오는 중...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '12px' }}>
        <p style={{ color: '#5C3D2E', fontSize: '14px' }}>{error || '방을 찾을 수 없어요.'}</p>
        <button onClick={goToLiving} style={btnSecondary}>거실로</button>
      </div>
    )
  }

  const countdown = room.seed_mode && room.bloom_date ? getCountdown(room.bloom_date) : null

  // TopBar = 마당/거실/서재 공통 내비만. 방 액션은 메타줄.
  return (
    <div style={{ minHeight: '100vh', background: '#FBF8F2' }}>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title={room.room_name}
      />

      <div style={metaStrip}>
        <span style={visibilityBadge(room.visibility)}>
          {room.visibility === 'public' ? '공개' : room.visibility === 'invite' ? '이웃공개' : '비공개'}
        </span>
        {room.seed_mode && <span style={seedBadge}>🌱 씨앗</span>}
        {house && (
          <button type="button" onClick={goToLiving} style={metaHouseBtn}>
            {LANG_FLAG[house.primary_language] || '🏡'} {house.title}
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => setShowShare(true)} style={iconBtn} aria-label="공유">
            🔗
          </button>
          {canWrite && (
            <button type="button" onClick={() => setShowSettings(true)} style={iconBtn} aria-label="설정">
              ⚙️
            </button>
          )}
          {canWrite && (
            <Link href={`/write?room_id=${roomId}`} style={writeBtnStyle}>
              + 글쓰기
            </Link>
          )}
        </div>
      </div>

      {countdown && (
        <div style={{
          ...countdownBanner,
          background: countdown.bloomed
            ? 'linear-gradient(135deg, rgba(193,127,60,0.15), rgba(200,213,185,0.3))'
            : 'linear-gradient(135deg, rgba(74,82,64,0.08), rgba(193,127,60,0.08))',
          borderColor: countdown.bloomed ? 'rgba(193,127,60,0.4)' : 'rgba(74,82,64,0.15)',
        }}>
          <span style={{ fontSize: 20 }}>{countdown.bloomed ? '🌸' : '🌱'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: countdown.bloomed ? '#C17F3C' : '#4A5240' }}>
              {countdown.label}
            </div>
            {room.bloom_date && (
              <div style={{ fontSize: 11, color: '#9A8470', marginTop: 2 }}>
                {new Date(room.bloom_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      )}

      <main style={{ padding: '16px' }}>
        {posts.length === 0 ? (
          <EmptyState isOwner={canWrite} roomId={roomId} />
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
                }}
                onClick={() => router.push(`/posts/${post.id}`)}
                enableInlineComment
                ownerKey={ownerKey}
                showComments
              />
            ))}
          </div>
        )}
      </main>

      {showShare && (
        <ShareModal
          url={`https://corenull.vercel.app/rooms/${roomId}`}
          title={room.room_name}
          onClose={() => setShowShare(false)}
        />
      )}

      {showSettings && house && (
        <RoomSettingsModal
          roomId={room.id}
          roomName={room.room_name}
          visibility={room.visibility}
          seedMode={room.seed_mode}
          houseId={house.id}
          ownerKey={ownerKey}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onUpdate={(updated) => {
            setRoom(prev => prev ? { ...prev, ...updated } : prev)
          }}
          onLeft={() => {
            goToLiving()
          }}
        />
      )}
    </div>
  )
}

function EmptyState({ isOwner, roomId }: { isOwner: boolean; roomId: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <p style={{ fontSize: '32px', marginBottom: '12px' }}>🌱</p>
      <p style={{ fontSize: '14px', color: '#9A8470', marginBottom: '20px' }}>아직 글이 없어요</p>
      {isOwner && (
        <Link href={`/write?room_id=${roomId}`} style={writeBtnStyle}>첫 글 쓰기</Link>
      )}
    </div>
  )
}

const metaStrip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  padding: '10px 16px',
  borderBottom: '1px solid rgba(92,61,46,0.08)',
  background: '#FEFCF8',
}
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '50%',
  background: '#F5F0E8', border: 'none',
  fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const metaHouseBtn: React.CSSProperties = {
  fontSize: 12, color: '#9A8470', margin: 0, padding: '2px 0',
  border: 'none', background: 'none', cursor: 'pointer',
}
const writeBtnStyle: React.CSSProperties = {
  background: '#2C1810', color: '#FBF8F2', border: 'none',
  borderRadius: '20px', padding: '7px 14px', fontSize: '13px',
  cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
}
const btnSecondary: React.CSSProperties = {
  background: 'none', border: '1px solid #5C3D2E', color: '#5C3D2E',
  borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
}
const countdownBanner: React.CSSProperties = {
  margin: '12px 16px 0', padding: '14px 16px', borderRadius: '14px',
  border: '1px solid', display: 'flex', alignItems: 'center', gap: '12px',
}
function visibilityBadge(v: string): React.CSSProperties {
  const tone =
    v === 'public' ? { bg: '#E8EFE3', fg: '#4A5240' } :
    v === 'invite' ? { bg: '#FBEEDD', fg: '#8A5423' } :
    { bg: '#EFE6E1', fg: '#5C3D2E' }
  return {
    fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
    background: tone.bg, color: tone.fg, fontWeight: 600,
  }
}
const seedBadge: React.CSSProperties = {
  fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
  background: '#fef3e2', color: '#C17F3C', fontWeight: 600,
}
