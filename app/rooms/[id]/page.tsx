'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDeviceId } from '@/lib/deviceId'
import ShareModal from '@/components/corenull/ShareModal'

type Room = {
  id: string
  room_name: string
  visibility: 'public' | 'private'
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
  // 수정 후
  const [ownerKey, setOwnerKey] = useState('')
  // useEffect 안에 추가
  setOwnerKey(getDeviceId())

  const isOwner = house?.owner_key === ownerKey
  const canWrite = isOwner || isMember

  useEffect(() => {
  setOwnerKey(getDeviceId())  // ← 추가
  if (!roomId) return
  fetchRoom()
  }, [roomId])

  async function fetchRoom() {
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
        const mRes = await fetch(`/api/corenull/members?house_id=${rData.room.house_id}&device_id=${ownerKey}`)
        const mData = await mRes.json()
        setIsMember(!mData._error && mData.is_member === true)
      }

      const pRes = await fetch(`/api/corenull/posts?room_id=${roomId}&owner_key=${ownerKey}`)
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
        <button onClick={() => router.back()} style={btnSecondary}>← 돌아가기</button>
      </div>
    )
  }

  const countdown = room.seed_mode && room.bloom_date ? getCountdown(room.bloom_date) : null

  return (
    <div style={{ minHeight: '100vh', background: '#FBF8F2' }}>
      <header style={headerStyle}>
        <button onClick={() => router.back()} style={backBtnStyle}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#2C1810', margin: 0 }}>
              {room.room_name}
            </h1>
            <span style={visibilityBadge(room.visibility)}>
              {room.visibility === 'public' ? '공개' : '비공개'}
            </span>
            {room.seed_mode && <span style={seedBadge}>🌱 씨앗</span>}
          </div>
          {house && (
            <p style={{ fontSize: '12px', color: '#9A8470', margin: '2px 0 0' }}>
              {LANG_FLAG[house.primary_language] || '🏡'} {house.title}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={shareBtnStyle} onClick={() => setShowShare(true)}>🔗</button>
          {canWrite && (
            <Link href={`/write?room_id=${roomId}`} style={writeBtnStyle}>+ 글쓰기</Link>
          )}
        </div>
      </header>

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
              <PostCard key={post.id} post={post} />
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
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  const preview = post.content?.slice(0, 120) || ''
  const hasMore = (post.content?.length || 0) > 120
  const firstMedia = post.meta?.media?.[0]

  return (
    <Link href={`/posts/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={cardStyle}>
        {firstMedia?.type === 'image' && (
          <div style={imgWrap}>
            <img src={firstMedia.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
          </div>
        )}
        {firstMedia?.type === 'video' && (
          <div style={{ ...imgWrap, background: '#2d4a3e', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
            <span style={{ fontSize: '28px' }}>▶</span>
          </div>
        )}
        {preview && (
          <p style={{ fontSize: '14px', color: '#5C3D2E', margin: '0 0 8px', lineHeight: '1.6' }}>
            {preview}{hasMore && '…'}
          </p>
        )}
        <p style={{ fontSize: '11px', color: '#9A8470', margin: 0 }}>
          {formatDate(post.created_at)}
        </p>
      </div>
    </Link>
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

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '14px 16px',
  background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
  position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)',
}
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#2C1810', padding: '4px',
}
const writeBtnStyle: React.CSSProperties = {
  background: '#2C1810', color: '#FBF8F2', border: 'none',
  borderRadius: '20px', padding: '7px 14px', fontSize: '13px',
  cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
}
const shareBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%',
  background: '#F5F0E8', border: 'none',
  fontSize: 15, cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  background: 'none', border: '1px solid #5C3D2E', color: '#5C3D2E',
  borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
}
const countdownBanner: React.CSSProperties = {
  margin: '12px 16px 0', padding: '14px 16px', borderRadius: '14px',
  border: '1px solid', display: 'flex', alignItems: 'center', gap: '12px',
}
const cardStyle: React.CSSProperties = {
  background: '#FEFCF8', borderRadius: '12px',
  border: '1px solid rgba(92,61,46,0.12)', padding: '16px', cursor: 'pointer',
  boxShadow: '0 2px 12px rgba(44,24,16,0.06)',
}
const imgWrap: React.CSSProperties = {
  width: '100%', height: '180px', marginBottom: '12px', overflow: 'hidden',
}
function visibilityBadge(v: string): React.CSSProperties {
  return {
    fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
    background: v === 'public' ? '#e8f0e4' : '#f0ece8',
    color: v === 'public' ? '#4A5240' : '#5C3D2E', fontWeight: 600,
  }
}
const seedBadge: React.CSSProperties = {
  fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
  background: '#fef3e2', color: '#C17F3C', fontWeight: 600,
}