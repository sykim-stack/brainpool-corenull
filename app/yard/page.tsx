'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import MediaRenderer from '@/components/corenull/MediaRenderer'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function isBloomed(bloomDate: string | null): boolean {
  if (!bloomDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bloom = new Date(bloomDate)
  bloom.setHours(0, 0, 0, 0)
  return bloom <= today
}

export default function YardPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [ownerKey, setOwnerKey] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    fetch(`/api/corenull/yard`)
      .then(r => r.json())
      .then(d => {
        setPosts(d.data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={styles.loading}>🌳</div>

  const bloomed = posts.filter(p => p._room?.seed_mode && isBloomed(p._room?.bloom_date))
  const seeds   = posts.filter(p => p._room?.seed_mode && !isBloomed(p._room?.bloom_date))
  const normal  = posts.filter(p => !p._room?.seed_mode)

  return (
    <div>
      <div style={styles.header}>
        <span style={styles.headerTitle}>🌳 마당</span>
      </div>

      <div style={styles.feed}>
        {posts.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p style={{ fontSize: 14, color: '#9A8470', lineHeight: 1.6 }}>
              아직 이야기가 없어요.<br />첫 이야기를 남겨보세요.
            </p>
          </div>
        ) : (
          <>
            {bloomed.length > 0 && (
              <Section emoji="🌸" title="꽃이 피었어요" posts={bloomed} ownerKey={ownerKey} router={router}
                accent="#C17F3C" bg="rgba(193,127,60,0.06)" border="rgba(193,127,60,0.2)" />
            )}
            {seeds.length > 0 && (
              <Section emoji="🌱" title="자라는 씨앗" posts={seeds} ownerKey={ownerKey} router={router}
                accent="#4A5240" bg="rgba(74,82,64,0.05)" border="rgba(74,82,64,0.15)" />
            )}
            {normal.length > 0 && (
              <Section emoji="📝" title="이야기" posts={normal} ownerKey={ownerKey} router={router}
                accent="#5C4A35" bg="transparent" border="transparent" />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ emoji, title, posts, ownerKey, router, accent, bg, border }: any) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 4px 8px' }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: accent, letterSpacing: '0.5px' }}>{title}</span>
        <span style={{ fontSize: 11, color: '#9A8470' }}>({posts.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.map((post: any) => (
          <PostCard
            key={post.id}
            post={post}
            ownerKey={ownerKey}
            onClick={() => router.push(`/posts/${post.id}`)}
            sectionBg={bg}
            sectionBorder={border}
          />
        ))}
      </div>
    </div>
  )
}

function PostCard({ post, ownerKey, onClick, sectionBg, sectionBorder }: any) {
  const [showTranslate, setShowTranslate] = useState(false)
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)

  const media = post.meta?.media || []
  const room = post._room
  const langFlag = room?.house_language ? (LANG_FLAG[room.house_language] || '🏡') : '🏡'
  const [commentCount, setCommentCount] = useState(0)

  useEffect(() => {
    fetch(`/api/corenull/posts?parent_id=${post.id}`)
      .then(r => r.json())
      .then(d => setCommentCount((d.data || []).length))
  }, [post.id])

  // 관심 초기 상태 확인
  useEffect(() => {
    if (!ownerKey) return
    fetch(`/api/corenull/bookmarks?owner_key=${ownerKey}`)
      .then(r => r.json())
      .then(d => {
        const found = (d.data || []).find((b: any) => b.message_id === post.id)
        if (found) {
          setBookmarkId(found.id)
          setIsActive(!found.ended_at)
        }
      })
  }, [ownerKey, post.id])

  const handleInterest = async (e: any) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)

    if (!bookmarkId) {
      // 새로 관심 등록
      const res = await fetch('/api/corenull/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_key: ownerKey, message_id: post.id }),
      })
      const data = await res.json()
      if (data.data) {
        setBookmarkId(data.data.id)
        setIsActive(true)
      }
    } else if (isActive) {
      // 관심 → 관심종료
      await fetch('/api/corenull/bookmarks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookmarkId, owner_key: ownerKey, action: 'end' }),
      })
      setIsActive(false)
    } else {
      // 관심종료 → 관심중 복구
      await fetch('/api/corenull/bookmarks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookmarkId, owner_key: ownerKey, action: 'resume' }),
      })
      setIsActive(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      ...styles.card,
      background: sectionBg !== 'transparent' ? sectionBg : '#FEFCF8',
      borderColor: sectionBorder !== 'transparent' ? sectionBorder : 'rgba(92,61,46,0.12)',
    }} onClick={onClick}>
      <div style={styles.cardHeader}>
        <div style={styles.spaceRow}>
          <span style={styles.spaceHouse}>{langFlag} {room?.house_title || '집'}</span>
          <span style={styles.spaceSep}>·</span>
          <span style={styles.spaceRoom}>{room?.room_name || '방'}</span>
          {room?.seed_mode && (
            <span style={styles.seedTag}>{isBloomed(room?.bloom_date) ? '🌸' : '🌱'}</span>
          )}
        </div>
        <div style={styles.authorRow}>
          <div style={styles.avatar}>🌿</div>
          <span style={styles.authorName}>작성자</span>
          <span style={styles.postTime}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>

      {media.length > 0 && (
        <div onClick={e => e.stopPropagation()} style={{ padding: '0 12px' }}>
          <MediaRenderer media={media} />
        </div>
      )}

      <div style={styles.cardBody}>
        <div style={styles.postText}>{post.content}</div>
        {post.translated_ko && (
          <div>
            <div style={styles.translateToggle} onClick={e => { e.stopPropagation(); setShowTranslate(!showTranslate) }}>
              <span>🇰🇷</span>
              <span style={styles.translateLabel}>{showTranslate ? '번역 닫기' : '번역 보기'}</span>
              <span style={{ fontSize: 10, color: '#C17F3C' }}>{showTranslate ? '▴' : '▾'}</span>
            </div>
            {showTranslate && <div style={styles.translateResult}>{post.translated_ko}</div>}
          </div>
        )}
      </div>

      <div style={styles.cardFooter}>
        <button style={styles.footerAction} onClick={e => e.stopPropagation()}>
          💬 {commentCount}
        </button>
        <div style={{ flex: 1 }} />
        <button
          style={{ ...styles.interestBtn, opacity: loading ? 0.5 : 1 }}
          onClick={handleInterest}
          disabled={loading}
        >
          <span style={{ fontSize: 18, color: isActive ? '#C17F3C' : '#9A8470' }}>
            {isActive ? '◉' : '○'}
          </span>
          <span style={{ fontSize: 11, color: isActive ? '#C17F3C' : '#9A8470' }}>
            {isActive ? '관심중' : bookmarkId ? '관심종료' : '관심'}
          </span>
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', padding: '0 20px',
    zIndex: 100, backdropFilter: 'blur(12px)',
  },
  headerTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810' },
  feed: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  empty: { textAlign: 'center', padding: '48px 24px', color: '#9A8470' },
  card: {
    borderRadius: 18, border: '1px solid',
    overflow: 'hidden', boxShadow: '0 2px 20px rgba(44,24,16,0.08)', cursor: 'pointer',
  },
  cardHeader: { padding: '14px 16px 10px' },
  spaceRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  spaceHouse: { fontSize: 12, fontWeight: 500, color: '#4A5240', background: 'rgba(74,82,64,0.1)', padding: '3px 8px', borderRadius: 20 },
  spaceSep: { fontSize: 11, color: '#9A8470' },
  spaceRoom: { fontSize: 12, color: '#5C4A35' },
  seedTag: { fontSize: 12 },
  authorRow: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #5C3D2E, #C17F3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  authorName: { fontSize: 13, fontWeight: 500, color: '#1C1208', flex: 1 },
  postTime: { fontSize: 11, color: '#9A8470' },
  cardBody: { padding: '12px 16px' },
  postText: { fontSize: 14, lineHeight: 1.7, color: '#1C1208' },
  translateToggle: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(92,61,46,0.12)', cursor: 'pointer', width: 'fit-content' },
  translateLabel: { fontSize: 12, color: '#C17F3C', fontWeight: 500 },
  translateResult: { marginTop: 8, fontSize: 13, lineHeight: 1.65, color: '#5C4A35' },
  cardFooter: { padding: '10px 16px 14px', display: 'flex', alignItems: 'center', gap: 16 },
  footerAction: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#9A8470', border: 'none', background: 'none', cursor: 'pointer' },
  interestBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
    borderRadius: 20,
  },
}