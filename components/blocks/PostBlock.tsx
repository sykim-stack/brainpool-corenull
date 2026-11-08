'use client'

import { useEffect, useState } from 'react'
import MediaRenderer from '@/components/corenull/MediaRenderer'

export interface PostBlockViewMeta {
  house_name?: string | null
  room_name?: string | null
  relation?: '나' | '이웃' | '공개' | string | null
  stage_emoji?: string | null
  status?: string | null
}

export interface PostBlockData {
  id: string
  content: string
  media?: { type: 'image' | 'video' | 'audio' | 'pdf' | 'file'; url: string; file?: string }[]
  created_at: string
  comment_count?: number
  view_meta?: PostBlockViewMeta
  room_id?: string
  isSample?: boolean
  pinned?: boolean
}

export interface PostBlockProps {
  post: PostBlockData
  onClick?: () => void
  onCommentClick?: () => void
  showViewMeta?: boolean
  showComments?: boolean
  showInterest?: boolean
  interestState?: 'none' | 'active' | 'ended'
  interestLoading?: boolean
  onInterestClick?: () => void
  onInterestGoLibrary?: () => void
  showHouseName?: boolean
  enableInlineComment?: boolean
  ownerKey?: string
  onCommentSubmitted?: () => void
  variant?: 'default' | 'gallery'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 2) return '어제'
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function PostBlock({
  post,
  onClick,
  onCommentClick,
  showViewMeta = true,
  showComments = true,
  showInterest = false,
  interestState = 'none',
  interestLoading = false,
  onInterestClick,
  onInterestGoLibrary,
  showHouseName = true,
  enableInlineComment = false,
  ownerKey,
  onCommentSubmitted,
  variant = 'default',
}: PostBlockProps) {
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localCount, setLocalCount] = useState(post.comment_count ?? 0)
  const [comments, setComments] = useState<{ id: string; content: string; created_at: string }[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  const isGallery = variant === 'gallery'
  const isSample = !!post.isSample
  const hasMedia = !!(post.media && post.media.length > 0)

  useEffect(() => {
    setLocalCount(post.comment_count ?? 0)
  }, [post.comment_count])

  useEffect(() => {
    if (!commentOpen || !post.id || isSample) return
    let cancelled = false
    setCommentsLoading(true)
    fetch(`/api/corenull/posts?parent_id=${encodeURIComponent(post.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const list = (d.data || []).map((c: any) => ({
          id: c.id,
          content: c.content || '',
          created_at: c.created_at,
        }))
        setComments(list)
        setLocalCount(list.length)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [commentOpen, post.id, isSample])

  const handleCommentSubmit = async () => {
    if (!ownerKey || !commentText.trim() || isSample) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/corenull/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: post.room_id,
          owner_key: ownerKey,
          content: commentText.trim(),
          type: 'comment',
          relations: { parent_id: post.id },
        }),
      })
      const data = await res.json()
      if (data.data) {
        const created = data.data
        setComments((prev) => [
          ...prev,
          {
            id: created.id,
            content: created.content || commentText.trim(),
            created_at: created.created_at || new Date().toISOString(),
          },
        ])
        setLocalCount((c) => c + 1)
        setCommentText('')
        onCommentSubmitted?.()
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false)
    }
  }

  const contentStyle: React.CSSProperties = isGallery
    ? { ...styles.content, ...styles.contentGallery }
    : styles.content

  return (
    <div
      style={{
        ...styles.card,
        ...(isGallery ? styles.cardGallery : {}),
        cursor: onClick && !isSample ? 'pointer' : 'default',
      }}
      onClick={isSample ? undefined : onClick}
    >
      {hasMedia && (
        <div style={styles.mediaWrap} onClick={(e) => e.stopPropagation()}>
          <MediaRenderer media={post.media!} />
        </div>
      )}

      {post.pinned && (
        <div style={styles.pinBadge} aria-label="공지">
          📌 공지
        </div>
      )}
      <div style={contentStyle}>{post.content}</div>

      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <span style={styles.date}>{formatDate(post.created_at)}</span>
          {showComments && (
            <button
              type="button"
              style={styles.commentBtn}
              onClick={(e) => {
                e.stopPropagation()
                if (enableInlineComment && !isSample) setCommentOpen((v) => !v)
                else onCommentClick?.()
              }}
            >
              💬 {localCount}
            </button>
          )}
        </div>
        {showInterest && !isSample && (
          <button
            type="button"
            style={styles.interestBtn}
            onClick={(e) => {
              e.stopPropagation()
              onInterestClick?.()
            }}
            disabled={interestLoading}
          >
            {interestState === 'active' ? '💛' : '🤍'}
          </button>
        )}
      </div>

      {showInterest && interestState === 'active' && onInterestGoLibrary && (
        <button type="button" style={styles.libraryLink} onClick={(e) => { e.stopPropagation(); onInterestGoLibrary() }}>
          서재에서 보기
        </button>
      )}

      {enableInlineComment && commentOpen && !isSample && (
        <div style={styles.commentPanel} onClick={(e) => e.stopPropagation()}>
          <div style={styles.commentPanelHead}>
            <span style={styles.commentPanelTitle}>댓글</span>
          </div>
          {commentsLoading ? (
            <div style={styles.commentEmpty}>불러오는 중…</div>
          ) : comments.length === 0 ? (
            <div style={styles.commentEmpty}>아직 댓글이 없어요</div>
          ) : (
            <div style={styles.commentList}>
              {comments.map((c) => (
                <div key={c.id} style={styles.commentItem}>
                  <div style={styles.commentAvatar}>👤</div>
                  <div style={styles.commentBody}>
                    <div style={styles.commentContent}>{c.content}</div>
                    <div style={styles.commentTime}>{formatDate(c.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={styles.commentForm}>
            <textarea
              style={styles.commentInput}
              rows={2}
              placeholder="댓글을 남겨보세요"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div style={styles.commentActions}>
              <button type="button" style={styles.commentCancel} onClick={() => setCommentOpen(false)}>
                닫기
              </button>
              <button
                type="button"
                style={styles.commentSubmit}
                disabled={!commentText.trim() || submitting || !ownerKey}
                onClick={handleCommentSubmit}
              >
                {submitting ? '…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewMeta && post.view_meta && (
        <div style={styles.viewMeta}>
          {showHouseName && post.view_meta.house_name && <span>{post.view_meta.house_name}</span>}
          {post.view_meta.room_name && <span>{post.view_meta.room_name}</span>}
          {post.view_meta.stage_emoji && <span>{post.view_meta.stage_emoji}</span>}
        </div>
      )}
    </div>
  )
}

export function PostBlockGrid({
  children,
  count,
}: {
  children: React.ReactNode
  count?: number
}) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#FEFCF8',
    borderRadius: 16,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardGallery: { padding: 10 },
  mediaWrap: { borderRadius: 12, overflow: 'hidden' },
  pinBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#4A7C3F',
    background: 'rgba(74,124,63,0.1)',
    border: '1px solid rgba(74,124,63,0.22)',
    borderRadius: 8,
    padding: '3px 8px',
  },
  content: {
    fontSize: 14,
    lineHeight: 1.65,
    color: '#1C1208',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  contentGallery: {
    fontSize: 13,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  } as React.CSSProperties,
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  date: { fontSize: 11, color: '#9A8470' },
  commentBtn: {
    display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9A8470',
    border: 'none', background: 'none', cursor: 'pointer', padding: 0,
  },
  interestBtn: {
    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
    cursor: 'pointer', padding: '4px 8px', borderRadius: 20, flexShrink: 0, fontSize: 12,
  },
  libraryLink: {
    alignSelf: 'flex-end', border: 'none', background: 'none', color: '#C17F3C',
    fontSize: 11, cursor: 'pointer', padding: 0,
  },
  commentPanel: {
    display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8,
    borderTop: '1px solid rgba(92,61,46,0.08)',
  },
  commentPanelHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  commentPanelTitle: { fontSize: 12, fontWeight: 600, color: '#5C4A35' },
  commentList: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' },
  commentItem: { display: 'flex', gap: 8 },
  commentAvatar: {
    width: 26, height: 26, borderRadius: '50%', background: 'rgba(74,82,64,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
  },
  commentBody: { flex: 1, minWidth: 0 },
  commentContent: { fontSize: 13, lineHeight: 1.55, color: '#1C1208', whiteSpace: 'pre-wrap' },
  commentTime: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  commentEmpty: { fontSize: 12, color: '#9A8470', padding: '6px 0' },
  commentForm: { display: 'flex', flexDirection: 'column', gap: 8 },
  commentInput: {
    width: '100%', borderRadius: 12, border: '1px solid rgba(92,61,46,0.15)',
    padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none',
    background: '#fff', color: '#1C1208', boxSizing: 'border-box',
  },
  commentActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  commentCancel: { border: 'none', background: 'none', color: '#9A8470', fontSize: 12, cursor: 'pointer' },
  commentSubmit: {
    border: 'none', background: '#2C1810', color: '#FEFCF8', fontSize: 12,
    padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
  },
  viewMeta: {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9A8470',
    paddingTop: 8, borderTop: '1px solid rgba(92,61,46,0.08)', flexShrink: 0,
  },
}
