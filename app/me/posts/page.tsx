'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getDeviceId } from '@/lib/deviceId'

type Post = {
  id: string
  content: string
  meta: {
    media?: { type: string; url: string }[]
    archived?: boolean
    reborn_from?: string
  }
  created_at: string
}

export default function MyPostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [ownerKey, setOwnerKey] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    fetch(`/api/corenull/library?owner_key=${key}`)
      .then(r => r.json())
      .then(d => {
        setPosts(d.data?.my_posts || [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={{ fontSize: 32 }}>📝</span>
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>내가 쓴 이야기</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.body}>
        {posts.length === 0 ? (
          <Empty />
        ) : (
          <div style={styles.list}>
            {posts.map(post => (
              <PostItem
                key={post.id}
                post={post}
                onClick={() => router.push(`/posts/${post.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PostItem ─────────────────────────────────────────────
function PostItem({ post, onClick }: { post: Post; onClick: () => void }) {
  const thumb = post.meta?.media?.find(m => m.type === 'image')
  const preview = post.content?.slice(0, 80) || ''
  const hasMore = (post.content?.length || 0) > 80

  return (
    <div style={styles.item} onClick={onClick}>
      {/* 썸네일 */}
      {thumb && (
        <img src={thumb.url} alt="" style={styles.thumb} />
      )}

      {/* 내용 */}
      <div style={styles.itemInfo}>
        <p style={styles.itemContent}>
          {preview}{hasMore ? '…' : ''}
        </p>
        <div style={styles.itemMeta}>
          {post.meta?.archived && (
            <span style={styles.archivedBadge}>보관됨</span>
          )}
          {post.meta?.reborn_from && (
            <span style={styles.rebornBadge}>재탄생</span>
          )}
          <span style={styles.itemDate}>
            {formatDate(post.created_at)}
          </span>
        </div>
      </div>

      <span style={styles.arrow}>›</span>
    </div>
  )
}

// ─── Empty ────────────────────────────────────────────────
function Empty() {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
      <p style={{ fontSize: 14, color: '#9A8470', lineHeight: 1.6 }}>
        아직 쓴 이야기가 없어요
      </p>
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
const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '50vh',
  },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  backBtn: {
    fontSize: 20, color: '#2C1810', background: 'none', border: 'none', cursor: 'pointer',
  },
  headerTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: '#2C1810',
  },
  body: {
    padding: '16px',
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  item: {
    background: '#FEFCF8', borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer',
  },
  thumb: {
    width: 52, height: 52, borderRadius: 8,
    objectFit: 'cover', flexShrink: 0,
  },
  itemInfo: {
    flex: 1, minWidth: 0,
  },
  itemContent: {
    fontSize: 13, color: '#1C1208', lineHeight: 1.5,
    margin: '0 0 4px',
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  itemMeta: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  itemDate: {
    fontSize: 11, color: '#9A8470',
  },
  archivedBadge: {
    fontSize: 10, color: '#9A8470',
    background: 'rgba(92,61,46,0.08)', padding: '2px 6px', borderRadius: 6,
  },
  rebornBadge: {
    fontSize: 10, color: '#C17F3C',
    background: 'rgba(193,127,60,0.1)', padding: '2px 6px', borderRadius: 6,
  },
  arrow: {
    fontSize: 16, color: '#9A8470', flexShrink: 0,
  },
}