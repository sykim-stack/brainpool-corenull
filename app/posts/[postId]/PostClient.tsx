'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import { prepareUploadFile } from '@/lib/compressMedia'
import { uploadOneFile } from '@/lib/uploadClient'
import ShareModal from '@/components/corenull/ShareModal'
import MediaRenderer from '@/components/corenull/MediaRenderer'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'

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
  const [accessDenied, setAccessDenied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editMedia, setEditMedia] = useState<any[]>([])
  const [editRoomId, setEditRoomId] = useState('')
  const [writableRooms, setWritableRooms] = useState<any[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key)
    if (!postId) return
    if (key) {
      fetch(`/api/corenull/rooms?scope=writable&owner_key=${encodeURIComponent(key)}`)
        .then((r) => r.json())
        .then((d) => setWritableRooms(d.data || []))
        .catch(() => {})
    }
    Promise.all([
      fetch(`/api/corenull/posts?post_id=${postId}&owner_key=${key}`).then(r => r.json()),
      fetch(`/api/corenull/posts?parent_id=${postId}`).then(r => r.json()),
    ]).then(async ([p, c]) => {
      if (p._error === 'ACCESS_DENIED') {
        setAccessDenied(true)
        setLoading(false)
        return
      }
      const postData = p.data || null
      setPost(postData)
      setEditContent(postData?.content || '')
      setEditMedia(postData?.meta?.media || [])
      setComments(c.data?.filter((m: any) => m.type === 'comment') || [])
      setFruit(c.data?.filter((m: any) => m.type === 'fruit')[0] || null)
      if (postData?.room_id) {
        const rRes = await fetch(`/api/corenull/rooms?room_id=${postData.room_id}&owner_key=${key}`).then(r => r.json())
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

  const isPostOwner = post?.owner_key === ownerKey
  const isHouseOwner = house?.owner_key === ownerKey
  const isSeedRoom = room?.seed_mode === true
  const showFruitActions = isHouseOwner && isSeedRoom && post?.type === 'post'
  const isHarvested = !!fruit?.harvested_at

  const handleEditOpen = () => {
    setEditContent(post.content)
    setEditMedia(post.meta?.media || [])
    setEditRoomId(post.room_id || '')
    setEditMode(true)
  }

  const handleRemoveMedia = (index: number) => {
    setEditMedia(prev => prev.filter((_: any, i: number) => i !== index))
  }

  const handleAddMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    setUploadMessage('사진 압축 및 업로드 준비 중…')
    const failures: string[] = []
    const savings: string[] = []
    let uploadedCount = 0
    try {
      for (const file of files) {
        const prepared = await prepareUploadFile(file)
        if (!prepared.ok) {
          failures.push(`${file.name}: ${prepared.error}`)
          continue
        }
        if (prepared.note) savings.push(`${file.name}: ${prepared.note}`)

        setUploadMessage(`${file.name}: 업로드 중…`)
        const result = await uploadOneFile(prepared.file, {
          postId: postId ? String(postId) : undefined,
        })
        if (!result.ok) {
          failures.push(`${file.name}: ${result.error}`)
          continue
        }
        setEditMedia(prev => [...prev, result.item])
        uploadedCount++
      }

      if (failures.length > 0) {
        setUploadMessage(`일부 실패: ${failures.join(' / ')}`)
      } else if (savings.length > 0) {
        setUploadMessage(`업로드 완료 (${uploadedCount}개) · ${savings[0]}`)
      } else {
        setUploadMessage(uploadedCount > 0 ? `업로드 완료 (${uploadedCount}개)` : '')
      }
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : '업로드 중 오류')
    } finally {
      setUploading(false)
    }
  }

  const handleEditSave = async () => {
    if (!editContent.trim() || editSaving) return
    setEditSaving(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: postId,
        owner_key: ownerKey,
        action: 'edit',
        content: editContent.trim(),
        meta: { ...(post.meta || {}), media: editMedia },
        room_id: editRoomId || post.room_id,
      }),
    })
    const data = await res.json()
    if (data.data) {
      setPost(data.data)
      setEditMode(false)
    }
    setEditSaving(false)
  }

  const handlePinToggle = async () => {
    if (!post || !ownerKey || pinLoading) return
    if (post.type !== 'post') return
    const isPinned = !!post.meta?.pinned
    setPinLoading(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: postId,
        owner_key: ownerKey,
        action: isPinned ? 'unpin' : 'pin',
      }),
    })
    const data = await res.json()
    if (data.data) setPost(data.data)
    setPinLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('이 이야기를 삭제할까요?')) return
    setDeleting(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, owner_key: ownerKey, action: 'delete' }),
    })
    const data = await res.json()
    if (data.data) router.back()
    setDeleting(false)
  }

  const handleMakeFruit = async () => {
    if (!post || fruitLoading) return
    setFruitLoading(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: post.room_id, owner_key: ownerKey, type: 'fruit',
        content: post.content, meta: post.meta || {}, relations: { parent_id: postId },
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
      body: JSON.stringify({ post_id: fruit.id, owner_key: ownerKey, action: 'harvest' }),
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
        room_id: post.room_id, owner_key: ownerKey,
        content: newComment.trim(), type: 'comment', relations: { parent_id: postId },
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
  if (accessDenied) return <div style={styles.loading}>🔒 볼 수 없는 이야기예요</div>
  if (!post) return <div style={styles.loading}>포스트를 찾을 수 없어요</div>

  const media = post.meta?.media || []

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="이야기" />

      {(isPostOwner || isHouseOwner) && !editMode && (
        <div style={styles.metaStrip}>
          {isHouseOwner && post.type === 'post' && (
            <button
              style={styles.actionBtn}
              onClick={handlePinToggle}
              disabled={pinLoading}
              aria-label={post.meta?.pinned ? '공지 해제' : '공지 고정'}
              title={post.meta?.pinned ? '공지 해제' : '공지 고정'}
            >
              {post.meta?.pinned ? '📌✓' : '📌'}
            </button>
          )}
          {isPostOwner && (
            <>
              <button style={styles.actionBtn} onClick={handleEditOpen} aria-label="수정">✏️</button>
              <button style={styles.actionBtn} onClick={handleDelete} disabled={deleting} aria-label="삭제">🗑️</button>
            </>
          )}
        </div>
      )}

      <div style={styles.body}>
        {(house || room) && (
          <div style={styles.spaceRow}>
            {house && <span style={styles.spaceHouse}>🏡 {house.title}</span>}
            {house && room && <span style={styles.spaceSep}>·</span>}
            {room && <span style={styles.spaceRoom}>{room.room_name}</span>}
            {room?.seed_mode && <span style={styles.seedTag}>🌱 씨앗</span>}
          </div>
        )}

        {!!post.meta?.pinned && (
          <div style={styles.pinBadge} aria-label="공지">📌 공지</div>
        )}

        <div style={styles.authorRow}>
          <div style={styles.avatar}>🌿</div>
          <span style={styles.authorName}>작성자</span>
          <span style={styles.postTime}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
        </div>

        {editMode ? (
          <div style={styles.editBox}>
            {writableRooms.length > 0 && (
              <label style={styles.roomSelectLabel}>
                <span style={styles.roomSelectTitle}>방 이동</span>
                <select
                  style={styles.roomSelect}
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                >
                  {writableRooms.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.room_name || r.id.slice(0, 8)}</option>
                  ))}
                </select>
              </label>
            )}
            <textarea
              style={styles.editArea}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {editMedia.map((m: any, i: number) => (
                <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                  {m.type === 'video' ? (
                    <video src={m.url} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                  ) : (
                    <img src={m.url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <button type="button" onClick={() => handleRemoveMedia(i)} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#2C1810', color: '#fff', fontSize: 12, cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button type="button" style={styles.editCancelBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>갤러리</button>
              <button type="button" style={styles.editCancelBtn} onClick={() => cameraInputRef.current?.click()} disabled={uploading}>촬영</button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleAddMedia} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleAddMedia} />
            </div>
            {uploadMessage && <div style={{ fontSize: 12, color: '#9A8470', marginBottom: 8 }}>{uploadMessage}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.editSaveBtn} onClick={handleEditSave} disabled={editSaving || !editContent.trim()}>저장</button>
              <button style={styles.editCancelBtn} onClick={() => setEditMode(false)}>취소</button>
            </div>
          </div>
        ) : (
          <>
            {media.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <MediaRenderer media={media} />
              </div>
            )}
            <div style={styles.content}>{post.content}</div>
          </>
        )}

        <div style={styles.actions}>
          <button style={styles.translateToggle} onClick={() => setShowTranslate(v => !v)}>
            <span style={styles.translateLabel}>번역</span>
          </button>
          <button style={styles.translateToggle} onClick={() => setShowShare(true)}>
            <span style={styles.translateLabel}>공유</span>
          </button>
        </div>

        {showTranslate && post.translated_ko && (
          <div style={styles.translateResult}>{post.translated_ko}</div>
        )}

        {showFruitActions && (
          <div style={styles.fruitSection}>
            {!fruit ? (
              <button style={styles.fruitBtn} onClick={handleMakeFruit} disabled={fruitLoading}>🍎 열매 만들기</button>
            ) : isHarvested ? (
              <div style={styles.harvestedBadge}>수확 완료</div>
            ) : (
              <button style={styles.harvestBtn} onClick={handleHarvest} disabled={fruitLoading}>수확하기</button>
            )}
          </div>
        )}

        <div style={styles.divider} />
        <div style={styles.commentCount}>댓글 {comments.length}</div>
        {comments.length === 0 ? (
          <div style={styles.emptyComment}>아직 댓글이 없어요</div>
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

      {showShare && (
        <ShareModal
          open={showShare}
          onClose={() => setShowShare(false)}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={post.content?.slice(0, 40) || '이야기'}
        />
      )}
    </div>
  )
}

const styles: any = {
  loading: { padding: 40, textAlign: 'center', color: '#9A8470' },
  pinBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 12, fontWeight: 600, color: '#8B4513',
    background: 'rgba(193,127,60,0.12)', border: '1px solid rgba(193,127,60,0.28)',
    borderRadius: 8, padding: '4px 10px', marginBottom: 12,
  },
  metaStrip: {
    display: 'flex', gap: 8, padding: '8px 16px', justifyContent: 'flex-end',
    borderBottom: '1px solid rgba(92,61,46,0.08)',
  },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(92,61,46,0.15)',
    background: '#FEFCF8', fontSize: 16, cursor: 'pointer',
  },
  body: { padding: '16px 16px 100px', maxWidth: 480, margin: '0 auto' },
  spaceRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  spaceHouse: { fontSize: 13, color: '#5C4A35' },
  spaceSep: { color: '#C4B5A5' },
  spaceRoom: { fontSize: 13, color: '#9A8470' },
  seedTag: { fontSize: 11, color: '#4A7C3F', background: 'rgba(74,124,63,0.1)', padding: '2px 8px', borderRadius: 6 },
  authorRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 14, fontWeight: 500, color: '#2C1810' },
  postTime: { fontSize: 12, color: '#9A8470', marginLeft: 'auto' },
  content: { fontSize: 15, lineHeight: 1.7, color: '#1C1208', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 12 },
  actions: { display: 'flex', gap: 12, marginBottom: 8 },
  editBox: { marginBottom: 12 },
  roomSelectLabel: { display: 'block', marginBottom: 8 },
  roomSelectTitle: { fontSize: 12, color: '#9A8470', display: 'block', marginBottom: 4 },
  roomSelect: { width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(92,61,46,0.15)', fontSize: 14 },
  editArea: { width: '100%', minHeight: 120, borderRadius: 12, border: '1px solid rgba(92,61,46,0.15)', padding: 12, fontSize: 15, lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  editSaveBtn: { flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: '#2C1810', color: '#FEFCF8', fontSize: 14, cursor: 'pointer' },
  editCancelBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(92,61,46,0.2)', background: '#F5F0E8', fontSize: 14, cursor: 'pointer' },
  translateToggle: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 8, border: 'none', background: 'transparent' },
  translateLabel: { fontSize: 12, color: '#5C4A35' },
  translateResult: { background: 'rgba(92,61,46,0.06)', borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 1.7, color: '#1C1208', marginBottom: 12 },
  fruitSection: { margin: '12px 0' },
  fruitBtn: { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#C17F3C', color: 'white', fontSize: 14, cursor: 'pointer' },
  harvestBtn: { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#2C1810', color: 'white', fontSize: 14, cursor: 'pointer' },
  harvestedBadge: { fontSize: 13, color: '#4A5240', background: 'rgba(74,82,64,0.1)', padding: '10px 12px', borderRadius: 10 },
  divider: { height: 1, background: 'rgba(92,61,46,0.1)', margin: '16px 0' },
  commentCount: { fontSize: 14, fontWeight: 500, color: '#1C1208', marginBottom: 12 },
  emptyComment: { fontSize: 13, color: '#9A8470', padding: '12px 0' },
  commentList: { display: 'flex', flexDirection: 'column', gap: 12 },
  commentItem: { display: 'flex', gap: 10 },
  commentAvatar: { width: 28, height: 28, borderRadius: '50%', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  commentBody: { flex: 1 },
  commentContent: { fontSize: 14, lineHeight: 1.5, color: '#1C1208' },
  commentTime: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  commentInput: {
    position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto',
    display: 'flex', gap: 8, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
    background: '#FEFCF8', borderTop: '1px solid rgba(92,61,46,0.1)', zIndex: 20,
  },
  commentField: {
    flex: 1, height: 40, borderRadius: 20, border: '1px solid rgba(92,61,46,0.15)',
    padding: '0 14px', fontSize: 14, outline: 'none',
  },
  commentSubmit: {
    width: 40, height: 40, borderRadius: '50%', border: 'none',
    background: '#2C1810', color: '#FEFCF8', fontSize: 16, cursor: 'pointer',
  },
}
