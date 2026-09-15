'use client'

import { useState } from 'react'
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
}: PostBlockProps) {
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localCount, setLocalCount] = useState(post.comment_count ?? 0)

  const meta = post.view_meta
  const status = meta?.status
  const metaParts = [showHouseName ? meta?.house_name : null, meta?.room_name, meta?.relation].filter(Boolean)
  const metaLine = metaParts.join(' · ')
  const stage = meta?.stage_emoji

  const handleCommentBtn = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (enableInlineComment) {
      setCommentOpen((v) => !v)
      return
    }
    onCommentClick?.()
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!commentText.trim() || !ownerKey || submitting) return
    const roomId = post.room_id
    if (!roomId) {
      onCommentClick?.()
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/corenull/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          owner_key: ownerKey,
          content: commentText.trim(),
          type: 'comment',
          relations: { parent_id: post.id },
        }),
      })
      const data = await res.json()
      if (data.data) {
        setCommentText('')
        setLocalCount((c) => c + 1)
        setCommentOpen(false)
        onCommentSubmitted?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.card} onClick={onClick} role={onClick ? 'button' : undefined}>
      {(status || stage) && (
        <div style={styles.badgeRow}>
          {status && <span style={styles.statusBadge}>{status}</span>}
          {stage && <span style={styles.stageDot}>{stage}</span>}
        </div>
      )}

      {post.media && post.media.length > 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          <MediaRenderer media={post.media} aspect="4 / 3" />
        </div>
      )}

      <div style={styles.content}>{post.content}</div>

      <div style={styles.footerRow}>
        <div style={styles.footerLeft}>
          <span style={styles.date}>{formatDate(post.created_at)}</span>
          {showComments && (
            <button type="button" style={styles.commentBtn} onClick={handleCommentBtn}>
              💬 {localCount}
            </button>
          )}
        </div>

        {showInterest && (
          <button
            type="button"
            style={{
              ...styles.interestBtn,
              color: interestState === 'active' ? '#C17F3C' : '#9A8470',
              opacity: interestLoading ? 0.5 : 1,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onInterestClick?.()
            }}
            disabled={interestLoading}
          >
            {interestState === 'active' ? '● 관심' : interestState === 'ended' ? '○ 관심종료' : '○ 관심'}
          </button>
        )}
      </div>

      {showInterest && interestState === 'active' && onInterestGoLibrary && (
        <button
          type="button"
          style={styles.libraryLink}
          onClick={(e) => {
            e.stopPropagation()
            onInterestGoLibrary()
          }}
        >
          서재에서 보기 ›
        </button>
      )}

      {commentOpen && enableInlineComment && (
        <form style={styles.commentForm} onClick={(e) => e.stopPropagation()} onSubmit={submitComment}>
          <textarea
            style={styles.commentInput}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글 쓰기 (번역은 자동)"
            rows={2}
          />
          <div style={styles.commentActions}>
            <button type="button" style={styles.commentCancel} onClick={() => setCommentOpen(false)}>
              닫기
            </button>
            <button
              type="submit"
              style={{ ...styles.commentSubmit, opacity: !commentText.trim() || submitting ? 0.45 : 1 }}
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? '…' : '등록'}
            </button>
          </div>
        </form>
      )}

      {showViewMeta && metaLine && (
        <div style={styles.viewMeta}>
          <span>{metaLine}</span>
        </div>
      )}
    </div>
  )
}

/** 모바일 1열 / 768px+ 1·2·3열 — globals .cn-post-grid */
export function PostBlockGrid({
  children,
  count = 0,
}: {
  children: React.ReactNode
  count?: number
}) {
  const dataCount = count <= 1 ? '1' : count === 2 ? '2' : count === 3 ? '3' : 'many'
  return (
    <div className="cn-post-grid" data-count={dataCount}>
      {children}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#FEFCF8',
    borderRadius: 16,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '16px',
    boxShadow: '0 2px 12px rgba(44,24,16,0.06)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 6 },
  statusBadge: {
    fontSize: 10,
    color: '#5C4A35',
    background: 'rgba(92,61,46,0.08)',
    padding: '2px 8px',
    borderRadius: 999,
  },
  stageDot: { fontSize: 12 },
  content: { fontSize: 14.5, lineHeight: 1.7, color: '#1C1208', whiteSpace: 'pre-wrap' },
  footerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
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
  commentForm: { display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 },
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
    paddingTop: 8, borderTop: '1px solid rgba(92,61,46,0.08)',
  },
}
