'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────
type Room = {
  id: string
  room_name: string
  visibility: 'public' | 'private'
  event_mode: boolean
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
  }
  relations: {
    room_id?: string
    house_id?: string
  }
  created_at: string
  owner_key: string
}

// ─── Constants ───────────────────────────────────────────
const OWNER_KEY =
  typeof window !== 'undefined'
    ? localStorage.getItem('owner_key') || 'test-device-001'
    : 'test-device-001'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷',
  vi: '🇻🇳',
  en: '🇺🇸',
  ja: '🇯🇵',
  zh: '🇨🇳',
}

// ─── Component ───────────────────────────────────────────
export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isOwner = house?.owner_key === OWNER_KEY

  // ─── Fetch ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    fetchRoom()
  }, [roomId])

  async function fetchRoom() {
    setLoading(true)
    setError(null)

    try {
      // 방 정보
      const rRes = await fetch(`/api/corenull/rooms?room_id=${roomId}`)
      const rData = await rRes.json()
      if (rData._error || !rData.room) {
        setError('방을 찾을 수 없어요.')
        setLoading(false)
        return
      }
      setRoom(rData.room)

      // 집 정보
      const hRes = await fetch(`/api/corenull/houses?house_id=${rData.room.house_id}`)
      const hData = await hRes.json()
      if (!hData._error && hData.house) {
        setHouse(hData.house)
      }

      // 포스트 목록 + 방문 기록 (owner_key 전달)
      const pRes = await fetch(`/api/corenull/posts?room_id=${roomId}&owner_key=${OWNER_KEY}`)
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

  // ─── Render states ─────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--bark)', fontSize: '14px' }}>불러오는 중...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <p style={{ color: 'var(--bark)', fontSize: '14px' }}>{error || '방을 찾을 수 없어요.'}</p>
        <button onClick={() => router.back()} style={btnSecondary}>← 돌아가기</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* ── Header ── */}
      <header style={headerStyle}>
        <button onClick={() => router.back()} style={backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--soil)', margin: 0 }}>
              {room.room_name}
            </h1>
            <span style={visibilityBadge(room.visibility)}>
              {room.visibility === 'public' ? '공개' : '비공개'}
            </span>
            {room.event_mode && (
              <span style={eventBadge}>이벤트</span>
            )}
          </div>
          {house && (
            <p style={{ fontSize: '12px', color: 'var(--bark)', margin: '2px 0 0' }}>
              {LANG_FLAG[house.primary_language] || '🏡'} {house.title}
            </p>
          )}
        </div>
        {isOwner && (
          <Link
            href={`/write?room_id=${roomId}`}
            style={writeBtn}
          >
            + 글쓰기
          </Link>
        )}
      </header>

      {/* ── 포스트 목록 ── */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        {posts.length === 0 ? (
          <EmptyState isOwner={isOwner} roomId={roomId} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── PostCard ─────────────────────────────────────────────
function PostCard({ post }: { post: Post }) {
  const preview = post.content?.slice(0, 120) || ''
  const hasMore = (post.content?.length || 0) > 120

  return (
    <Link href={`/posts/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={cardStyle}>
        {/* 이미지 */}
        {post.meta?.image_url && (
          <div style={imagWrap}>
            <img
              src={post.meta.image_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
            />
          </div>
        )}

        {/* 영상 썸네일 */}
        {!post.meta?.image_url && post.meta?.video_url && (
          <div style={{ ...imagWrap, background: 'var(--bark)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
            <span style={{ fontSize: '28px' }}>▶</span>
          </div>
        )}

        {/* 제목 */}
        {post.meta?.title && (
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--soil)', margin: '0 0 6px' }}>
            {post.meta.title}
          </h2>
        )}

        {/* 본문 미리보기 */}
        {preview && (
          <p style={{ fontSize: '14px', color: 'var(--bark)', margin: '0 0 8px', lineHeight: '1.6' }}>
            {preview}{hasMore && '…'}
          </p>
        )}

        {/* 날짜 */}
        <p style={{ fontSize: '11px', color: '#aaa', margin: 0 }}>
          {formatDate(post.created_at)}
        </p>
      </div>
    </Link>
  )
}

// ─── EmptyState ───────────────────────────────────────────
function EmptyState({ isOwner, roomId }: { isOwner: boolean; roomId: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <p style={{ fontSize: '32px', marginBottom: '12px' }}>🌱</p>
      <p style={{ fontSize: '14px', color: 'var(--bark)', marginBottom: '20px' }}>
        아직 글이 없어요
      </p>
      {isOwner && (
        <Link href={`/write?room_id=${roomId}`} style={writeBtn}>
          첫 글 쓰기
        </Link>
      )}
    </div>
  )
}

// ─── Utils ────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// ─── Styles ───────────────────────────────────────────────
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 16px',
  background: 'var(--warm-white)',
  borderBottom: '1px solid #e8e0d5',
  position: 'sticky',
  top: 0,
  zIndex: 10,
}

const backBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  color: 'var(--soil)',
  padding: '4px',
}

const writeBtn: React.CSSProperties = {
  background: 'var(--soil)',
  color: 'var(--cream)',
  border: 'none',
  borderRadius: '20px',
  padding: '7px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const btnSecondary: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--bark)',
  color: 'var(--bark)',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '13px',
  cursor: 'pointer',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--warm-white)',
  borderRadius: '12px',
  padding: '16px',
  cursor: 'pointer',
  transition: 'transform 0.1s',
}

const imagWrap: React.CSSProperties = {
  width: '100%',
  height: '180px',
  marginBottom: '12px',
  overflow: 'hidden',
}

function visibilityBadge(v: string): React.CSSProperties {
  return {
    fontSize: '10px',
    padding: '2px 7px',
    borderRadius: '10px',
    background: v === 'public' ? '#e8f0e4' : '#f0ece8',
    color: v === 'public' ? 'var(--moss)' : 'var(--bark)',
    fontWeight: '600',
  }
}

const eventBadge: React.CSSProperties = {
  fontSize: '10px',
  padding: '2px 7px',
  borderRadius: '10px',
  background: '#fef3e2',
  color: 'var(--accent)',
  fontWeight: '600',
}