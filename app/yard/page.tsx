'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const OWNER_KEY = 'test-device-001'

export default function YardPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // 마당 = 공개 방들의 포스트 피드
    // 현재는 테스트 room_id로 조회 (나중에 public rooms 전체로 확장)
    fetch(`/api/corenull/yard`)
      .then(r => r.json())
      .then(d => {
        setPosts(d.data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={styles.loading}>🌳</div>

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>🌳 마당</span>
      </div>

      {/* 포스트 피드 */}
      <div style={styles.feed}>
        {posts.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p style={{ fontSize: 14, color: '#9A8470', lineHeight: 1.6 }}>
              아직 이야기가 없어요.<br />첫 이야기를 남겨보세요.
            </p>
          </div>
        ) : (
          posts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              ownerKey={OWNER_KEY}
              onClick={() => router.push(`/posts/${post.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function PostCard({ post, ownerKey, onClick }: any) {
  const [showTranslate, setShowTranslate] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  const media = post.meta?.media || []
  const firstMedia = media[0]
  const hasImage = firstMedia?.type === 'image'
  const hasVideo = firstMedia?.type === 'video'

  useEffect(() => {
    fetch(`/api/corenull/comments?post_id=${post.id}`)
      .then(r => r.json())
      .then(d => setCommentCount((d.data || []).length))
  }, [post.id])

  const handleBookmark = async (e: any) => {
    e.stopPropagation()
    if (bookmarked) return
    await fetch('/api/corenull/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_key: ownerKey, message_id: post.id }),
    })
    setBookmarked(true)
  }

  return (
    <div style={styles.card} onClick={onClick}>
      {/* 공간 먼저 */}
      <div style={styles.cardHeader}>
        <div style={styles.spaceRow}>
          <span style={styles.spaceHouse}>🏡 집</span>
          <span style={styles.spaceSep}>·</span>
          <span style={styles.spaceRoom}>방</span>
        </div>
        <div style={styles.authorRow}>
          <div style={styles.avatar}>🌿</div>
          <span style={styles.authorName}>작성자</span>
          <span style={styles.postTime}>
            {new Date(post.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
      </div>

      {/* 미디어 */}
      {hasImage && (
        <div style={styles.mediaImage}>
          <img src={firstMedia.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {hasVideo && (
        <div style={styles.mediaVideo}>
          <button style={styles.playBtn} onClick={e => e.stopPropagation()}>▶</button>
          <div style={styles.videoDuration}>🎬 0:15</div>
        </div>
      )}

      {/* 본문 */}
      <div style={styles.cardBody}>
        <div style={styles.postText}>{post.content}</div>

        {/* 번역 토글 — 나중에 언어 감지 후 조건부 표시 */}
        {post.translated_ko && (
          <div>
            <div
              style={styles.translateToggle}
              onClick={e => { e.stopPropagation(); setShowTranslate(!showTranslate) }}
            >
              <span>🇰🇷</span>
              <span style={styles.translateLabel}>
                {showTranslate ? '번역 닫기' : '번역 보기'}
              </span>
              <span style={{ fontSize: 10, color: '#C17F3C' }}>
                {showTranslate ? '▴' : '▾'}
              </span>
            </div>
            {showTranslate && (
              <div style={styles.translateResult}>{post.translated_ko}</div>
            )}
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div style={styles.cardFooter}>
        <button style={styles.footerAction} onClick={e => e.stopPropagation()}>
          💬 {commentCount}
        </button>
        <div style={{ flex: 1 }} />
        <button
          style={{ ...styles.bookmarkBtn, ...(bookmarked ? styles.bookmarked : {}) }}
          onClick={handleBookmark}
        >
          🔖
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '50vh', fontSize: 40,
  },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', padding: '0 20px',
    zIndex: 100, backdropFilter: 'blur(12px)',
  },
  headerTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810',
  },
  feed: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  empty: {
    textAlign: 'center', padding: '48px 24px', color: '#9A8470',
  },
  card: {
    background: '#FEFCF8', borderRadius: 18,
    border: '1px solid rgba(92,61,46,0.12)',
    overflow: 'hidden', boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
    cursor: 'pointer',
  },
  cardHeader: { padding: '14px 16px 10px' },
  spaceRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  spaceHouse: {
    fontSize: 12, fontWeight: 500, color: '#4A5240',
    background: 'rgba(74,82,64,0.1)', padding: '3px 8px', borderRadius: 20,
  },
  spaceSep: { fontSize: 11, color: '#9A8470' },
  spaceRoom: { fontSize: 12, color: '#5C4A35' },
  authorRow: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, #5C3D2E, #C17F3C)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
  },
  authorName: { fontSize: 13, fontWeight: 500, color: '#1C1208', flex: 1 },
  postTime: { fontSize: 11, color: '#9A8470' },
  mediaImage: { width: '100%', height: 220, overflow: 'hidden' },
  mediaVideo: {
    width: '100%', height: 220,
    background: 'linear-gradient(160deg, #1a1a2e 0%, #2d4a3e 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  playBtn: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
    border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, cursor: 'pointer', color: 'white',
  },
  videoDuration: {
    position: 'absolute', bottom: 10, right: 12,
    background: 'rgba(0,0,0,0.55)', color: 'white',
    fontSize: 11, padding: '3px 7px', borderRadius: 6,
  },
  cardBody: { padding: '12px 16px' },
  postText: { fontSize: 14, lineHeight: 1.7, color: '#1C1208' },
  translateToggle: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
    paddingTop: 10, borderTop: '1px solid rgba(92,61,46,0.12)',
    cursor: 'pointer', width: 'fit-content',
  },
  translateLabel: { fontSize: 12, color: '#C17F3C', fontWeight: 500 },
  translateResult: {
    marginTop: 8, fontSize: 13, lineHeight: 1.65, color: '#5C4A35',
  },
  cardFooter: {
    padding: '10px 16px 14px', display: 'flex', alignItems: 'center', gap: 16,
  },
  footerAction: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 13, color: '#9A8470', border: 'none', background: 'none', cursor: 'pointer',
  },
  bookmarkBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#F5F0E8', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, cursor: 'pointer',
  },
  bookmarked: { background: 'rgba(193,127,60,0.12)' },
}