'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import ShareModal from '@/components/corenull/ShareModal'

export default function PostDetailPage() {
  const { postId } = useParams()
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [post, setPost] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [house, setHouse] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [fruit, setFruit] = useState<any>(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fruitLoading, setFruitLoading] = useState(false)
  const [showTranslate, setShowTranslate] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!postId) return

    Promise.all([
      fetch(`/api/corenull/posts?post_id=${postId}`).then(r => r.json()),
      fetch(`/api/corenull/posts?parent_id=${postId}`).then(r => r.json()),
    ]).then(async ([p, c]) => {
      const postData = p.data || null
      setPost(postData)
      setComments(c.data?.filter((m: any) => m.type === 'comment') || [])
      setFruit(c.data?.filter((m: any) => m.type === 'fruit')[0] || null)

      if (postData?.room_id) {
        const rRes = await fetch(`/api/corenull/rooms?room_id=${postData.room_id}`).then(r => r.json())
        const roomData = rRes.room || null
        setRoom(roomData)
        if (roomData?.house_id) {
          const hRes = await fetch(`/api/corenull/houses?house_id=${roomData.house_id}`).then(r => r.json())
          setHouse(hRes.house || null)
        }
      }
      setLoading(false)
    })
  }, [postId])

  const isOwner = house?.owner_key === ownerKey
  const isSeedRoom = room?.seed_mode === true
  const showFruitActions = isOwner && isSeedRoom && post?.type === 'post'
  const isHarvested = !!fruit?.harvested_at

  const handleMakeFruit = async () => {
    if (!post || fruitLoading) return
    setFruitLoading(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: post.room_id,
        owner_key: ownerKey,
        type: 'fruit',
        content: post.content,
        meta: post.meta || {},
        relations: { parent_id: postId },
      }),
    })
    const data = await res.json()
    if (data.data) setFruit(data.data)
    setFruitLoading(false)
  }

  const handleHarvest = async () => {
    if (!fruit || fruitLoading) return
    setFruitLoading(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: fruit.id,
        owner_key: ownerKey,
        action: 'harvest',
      }),
    })
    const data = await res.json()
    if (data.data) setFruit(data.data)
    setFruitLoading(false)
  }

  const handleComment = async () => {
    if (!newComment.trim() || !post) return
    setSubmitting(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: post.room_id,
        owner_key: ownerKey,
        content: newComment.trim(),
        type: 'comment',
        relations: { parent_id: postId },
      }),
    })
    const data = await res.json()
    if (data.data) {
      setComments(prev => [...prev, data.data])
      setNewComment('')
    }
    setSubmitting(false)
  }

  if (loading) return <div style={styles.loading}>📖</div>
  if (!post) return <div style={styles.loading}>포스트를 찾을 수 없어요</div>

  const media = post.meta?.media || []
  const firstMedia = media[0]

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>이야기</span>
        <button style={styles.shareBtn} onClick={() => setShowShare(true)}>🔗</button>
      </div>

      <div style={styles.body}>
        <div style={styles.authorRow}>
          <div style={styles.avatar}>🌿</div>
          <span style={styles.authorName}>작성자</span>
          <span style={styles.postTime}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
        </div>

        {firstMedia?.type === 'image' && (
          <div style={styles.mediaWrap}>
            <img src={firstMedia.url} alt="" style={styles.mediaImg} />
          </div>
        )}
        {firstMedia?.type === 'video' && (
          <div style={styles.mediaVideo}>
            <button style={styles.playBtn}>▶</button>
          </div>
        )}

        <div style={styles.content}>{post.content}</div>

        {post.translated_ko && (
          <div>
            <div style={styles.translateToggle} onClick={() => setShowTranslate(!showTranslate)}>
              <span>🇰🇷</span>
              <span style={styles.translateLabel}>{showTranslate ? '번역 닫기' : '번역 보기'}</span>
              <span style={{ fontSize: 10, color: '#C17F3C' }}>{showTranslate ? '▴' : '▾'}</span>
            </div>
            {showTranslate && <div style={styles.translateResult}>{post.translated_ko}</div>}
          </div>
        )}

        {showFruitActions && (
          <div style={styles.fruitSection}>
            {!fruit && (
              <button
                style={{ ...styles.fruitBtn, opacity: fruitLoading ? 0.5 : 1 }}
                onClick={handleMakeFruit}
                disabled={fruitLoading}
              >
                🍎 열매로 만들기
              </button>
            )}
            {fruit && !isHarvested && (
              <button
                style={{ ...styles.harvestBtn, opacity: fruitLoading ? 0.5 : 1 }}
                onClick={handleHarvest}
                disabled={fruitLoading}
              >
                📚 서재에 수확하기
              </button>
            )}
            {fruit && isHarvested && (
              <div style={styles.harvestedBadge}>
                ✅ 서재에 보관됨 · {new Date(fruit.harvested_at).toLocaleDateString('ko-KR')}
              </div>
            )}
          </div>
        )}

        <div style={styles.divider} />

        <div style={styles.commentCount}>💬 댓글 {comments.length}</div>
        {comments.length === 0 ? (
          <div style={styles.emptyComment}>첫 댓글을 남겨보세요</div>
        ) : (
          <div style={styles.commentList}>
            {comments.map((c: any) => (
              <div key={c.id} style={styles.commentItem}>
                <div style={styles.commentAvatar}>🌱</div>
                <div style={styles.commentBody}>
                  <div style={styles.commentContent}>{c.content}</div>
                  <div style={styles.commentTime}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.commentInput}>
        <input
          style={styles.commentField}
          placeholder="댓글 남기기..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleComment()}
        />
        <button
          style={{ ...styles.commentSubmit, opacity: (!newComment.trim() || submitting) ? 0.4 : 1 }}
          onClick={handleComment}
          disabled={!newComment.trim() || submitting}
        >↑</button>
      </div>

      {showShare && post && (
        <ShareModal
          url={`https://corenull.vercel.app/posts/${postId}`}
          title={post.content?.slice(0, 30) || '이야기'}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  backBtn: { fontSize: 20, color: '#2C1810', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: '#2C1810' },
  shareBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#F5F0E8', border: 'none', fontSize: 16, cursor: 'pointer',
  },
  body: { padding: '16px 16px 80px' },
  authorRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #5C3D2E, #C17F3C)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  },
  authorName: { fontSize: 14, fontWeight: 500, color: '#1C1208', flex: 1 },
  postTime: { fontSize: 11, color: '#9A8470' },
  mediaWrap: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  mediaImg: { width: '100%', display: 'block' },
  mediaVideo: {
    width: '100%', height: 220, borderRadius: 12,
    background: 'linear-gradient(160deg, #1a1a2e 0%, #2d4a3e 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  playBtn: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
    fontSize: 22, cursor: 'pointer', color: 'white',
  },
  content: { fontSize: 16, lineHeight: 1.8, color: '#1C1208', marginBottom: 16 },
  translateToggle: {
    display: 'flex', alignItems: 'center', gap: 6,
    paddingTop: 12, borderTop: '1px solid rgba(92,61,46,0.12)',
    cursor: 'pointer', width: 'fit-content', marginBottom: 8,
  },
  translateLabel: { fontSize: 12, color: '#C17F3C', fontWeight: 500 },
  translateResult: { fontSize: 14, lineHeight: 1.7, color: '#5C4A35', marginBottom: 16 },
  fruitSection: { marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(92,61,46,0.1)' },
  fruitBtn: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #4A7C3F, #7AB648)',
    color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  harvestBtn: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #C17F3C, #E8A857)',
    color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  harvestedBadge: {
    textAlign: 'center', padding: '10px', fontSize: 13, color: '#4A7C3F',
    background: 'rgba(74,124,63,0.08)', borderRadius: 10,
  },
  divider: { height: 1, background: 'rgba(92,61,46,0.1)', margin: '16px 0' },
  commentCount: { fontSize: 13, fontWeight: 500, color: '#5C4A35', marginBottom: 12 },
  emptyComment: { fontSize: 13, color: '#9A8470', textAlign: 'center', padding: '24px 0' },
  commentList: { display: 'flex', flexDirection: 'column', gap: 12 },
  commentItem: { display: 'flex', gap: 10 },
  commentAvatar: {
    width: 28, height: 28, borderRadius: '50%', background: 'rgba(74,82,64,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
  },
  commentBody: { flex: 1 },
  commentContent: { fontSize: 14, lineHeight: 1.6, color: '#1C1208' },
  commentTime: { fontSize: 11, color: '#9A8470', marginTop: 3 },
  commentInput: {
    position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px',
    background: 'rgba(254,252,248,0.95)', borderTop: '1px solid rgba(92,61,46,0.12)',
    padding: '10px 16px', display: 'flex', gap: 8, backdropFilter: 'blur(12px)',
  },
  commentField: {
    flex: 1, height: 40, background: '#F5F0E8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 20, padding: '0 14px',
    fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: '#1C1208', outline: 'none',
  },
  commentSubmit: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#2C1810', color: 'white', border: 'none', fontSize: 18, cursor: 'pointer',
  },
}