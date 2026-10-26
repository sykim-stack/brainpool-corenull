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
  /** 화면 전용 샘플. DB 메시지가 아니므로 실제 활동 동작을 제공하지 않는다. */
  isSample?: boolean
  /** 화면에서 기능을 소개하는 샘플 전용 표시. DB에 저장하지 않는다. */
  sampleBadges?: string[]
  sampleCommentCount?: number
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
  tone?: 'default' | 'living'
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
  tone = 'default',
}: PostBlockProps) {
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localCount, setLocalCount] = useState(post.comment_count ?? 0)
  const [comments, setComments] = useState<
    { id: string; content: string; created_at: string }[]
  >([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  const isGallery = variant === 'gallery'
  const isSample = !!post.isSample
  const isLivingTone = tone === 'living'
  const hasMedia = !!(post.media && post.media.length > 0)

  useEffect(() => {
    if (isSample || !commentOpen || !enableInlineComment) return
    let cancelled = false
    setCommentsLoading(true)
    fetch(`/api/corenull/posts?parent_id=${post.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list = (data.data || []).filter(
          (m: any) => m.type === 'comment' || !m.type || m.type === 'fruit'
        )
        list.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setComments(
          list.map((c: any) => ({
            id: c.id,
            content: c.content || '',
            created_at: c.created_at,
          }))
        )
        setLocalCount(list.length)
      })
      .catch(() => {
        if (!cancelled) setComments([])
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [commentOpen, enableInlineComment, isSample, post.id])

  const meta = post.view_meta
  const status = meta?.status
  const metaParts = [
    showHouseName ? meta?.house_name : null,
    isLivingTone ? null : meta?.room_name,
    meta?.relation,
  ].filter(Boolean)
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
    if (isSample || !commentText.trim() || !ownerKey || submitting) return
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
        const created = data.data
        setCommentText('')
        setComments((prev) => [
          {
            id: created.id,
            content: created.content || commentText.trim(),
            created_at: created.created_at || new Date().toISOString(),
          },
          ...prev,
        ])
        setLocalCount((c) => c + 1)
        onCommentSubmitted?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const baseCardStyle: React.CSSProperties = isGallery
    ? { ...styles.card, ...styles.cardGallery }
    : styles.card
  const cardStyle: React.CSSProperties = isLivingTone
    ? { ...baseCardStyle, ...styles.livingCard }
    : baseCardStyle

  const contentStyle: React.CSSProperties = isGallery
    ? { ...styles.content, ...styles.contentGallery }
    : styles.content

  return (
    <div
      className={isLivingTone && !isSample ? 'cn-living-post-card' : undefined}
      style={isSample ? { ...cardStyle, cursor: 'default' } : cardStyle}
      onClick={isSample ? undefined : onClick}
      role={!isSample && onClick ? 'button' : undefined}
    >
      {(status || stage || isSample || (isLivingTone && meta?.room_name)) && (
        <div
          className={[
            isSample ? 'cn-sample-badge-row' : '',
            isLivingTone ? 'cn-living-badge-row' : '',
          ].filter(Boolean).join(' ') || undefined}
          style={styles.badgeRow}
        >
          {isLivingTone && meta?.room_name && (
            <span style={styles.livingRoomBadge}>{meta.room_name}</span>
          )}
          {isSample && <span className="cn-sample-badge" style={styles.sampleBadge}>샘플</span>}
          {isSample && post.sampleBadges?.map((badge) => (
            <span key={badge} className="cn-sample-badge" style={styles.sampleFeatureBadge}>{badge}</span>
          ))}
          {status && <span style={styles.statusBadge}>{status}</span>}
          {stage && <span style={styles.stageDot}>{stage}</span>}
        </div>
      )}

      {hasMedia ? (
        <div
          style={isGallery ? styles.mediaGallery : styles.mediaSlot}
          onClick={(e) => e.stopPropagation()}
        >
          <MediaRenderer media={post.media!} aspect="fill" />
        </div>
      ) : !isGallery || isSample ? (
        <div style={styles.mediaEmpty} aria-hidden>
          <span style={styles.mediaEmptyMark}>✎</span>
        </div>
      ) : null}

      <div style={contentStyle}>{post.content}</div>

      <div className={isSample ? 'cn-sample-footer' : undefined} style={styles.footerRow}>
        <div className={isSample ? 'cn-sample-footer-left' : undefined} style={styles.footerLeft}>
          <span className={isSample ? 'cn-sample-footer-date' : undefined} style={styles.date}>
            {isSample ? '샘플 게시글' : formatDate(post.created_at)}
          </span>
          {showComments && isSample && (
            <button
              type="button"
              className="cn-sample-footer-comment"
              style={styles.commentBtn}
              aria-label={`샘플 댓글 ${post.sampleCommentCount ?? 2}개 (동작하지 않음)`}
              aria-disabled="true"
              tabIndex={-1}
            >
              💬 {post.sampleCommentCount ?? 2}
            </button>
          )}
          {showComments && !isSample && (
            <button type="button" style={styles.commentBtn} onClick={handleCommentBtn}>
              💬 {localCount}
            </button>
          )}
        </div>

        {showInterest && isSample && (
          <button
            type="button"
            className="cn-sample-footer-interest"
            style={{ ...styles.interestBtn, color: '#9A8470' }}
            aria-label="관심 아이콘 샘플 (동작하지 않음)"
            aria-disabled="true"
            tabIndex={-1}
          >
            ○ 관심
          </button>
        )}
        {showInterest && !isSample && (
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

      {showInterest && !isSample && interestState === 'active' && onInterestGoLibrary && (
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
        <div style={styles.commentPanel} onClick={(e) => e.stopPropagation()}>
          <div style={styles.commentPanelHead}>
            <span style={styles.commentPanelTitle}>💬 댓글 {localCount}</span>
            <button type="button" style={styles.commentCancel} onClick={() => setCommentOpen(false)}>
              닫기
            </button>
          </div>

          {commentsLoading ? (
            <div style={styles.commentEmpty}>불러오는 중…</div>
          ) : comments.length === 0 ? (
            <div style={styles.commentEmpty}>아직 댓글이 없어요</div>
          ) : (
            <div style={styles.commentList}>
              {comments.map((c) => (
                <div key={c.id} style={styles.commentItem}>
                  <div style={styles.commentAvatar}>🌱</div>
                  <div style={styles.commentBody}>
                    <div style={styles.commentContent}>{c.content}</div>
                    <div style={styles.commentTime}>{formatDate(c.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form style={styles.commentForm} onSubmit={submitComment}>
            <textarea
              style={styles.commentInput}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글 쓰기 (번역은 자동)"
              rows={2}
            />
            <div style={styles.commentActions}>
              <button
                type="submit"
                style={{ ...styles.commentSubmit, opacity: !commentText.trim() || submitting ? 0.45 : 1 }}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? '…' : '등록'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showViewMeta && metaLine && (
        <div style={isLivingTone ? { ...styles.viewMeta, ...styles.livingViewMeta } : styles.viewMeta}>
          <span>{metaLine}</span>
        </div>
      )}
    </div>
  )
}

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
    padding: '12px',
    boxShadow: '0 2px 12px rgba(44,24,16,0.06)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    height: 'var(--cn-post-card-h, 280px)',
    maxHeight: 'var(--cn-post-card-h, 280px)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  mediaSlot: {
    borderRadius: 12,
    overflow: 'hidden',
    flex: '1 1 auto',
    minHeight: 0,
  },
  mediaEmpty: {
    borderRadius: 12,
    background: 'linear-gradient(145deg, rgba(92,61,46,0.06), rgba(74,82,64,0.08))',
    border: '1px dashed rgba(92,61,46,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1 1 auto',
    minHeight: 0,
  },
  mediaEmptyMark: {
    fontSize: 22,
    color: 'rgba(92,61,46,0.28)',
  },
  cardGallery: {
    height: '100%',
    maxHeight: '100%',
    minHeight: 0,
    padding: '10px',
    gap: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  livingCard: {
    background: 'linear-gradient(180deg, #FFFEFB 0%, #FEFCF8 100%)',
    border: '1px solid rgba(193,127,60,0.22)',
    boxShadow: '0 4px 16px rgba(92,61,46,0.075), inset 0 2px 0 rgba(216,185,111,0.48)',
  },
  mediaGallery: {
    flex: '1 1 auto',
    minHeight: 0,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  sampleBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#65491F',
    background: 'rgba(201,162,75,0.22)',
    border: '1px solid rgba(173,126,49,0.38)',
    padding: '3px 9px',
    borderRadius: 999,
  },
  sampleFeatureBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#4A5240',
    background: 'rgba(74,82,64,0.08)',
    border: '1px solid rgba(74,82,64,0.18)',
    padding: '3px 8px',
    borderRadius: 999,
  },
  livingRoomBadge: {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 10,
    fontWeight: 600,
    color: '#79542D',
    background: 'linear-gradient(135deg, #FFF9EC 0%, #F5E8CA 100%)',
    border: '1px solid rgba(193,127,60,0.28)',
    padding: '3px 8px',
    borderRadius: 999,
  },
  statusBadge: {
    fontSize: 10,
    color: '#5C4A35',
    background: 'rgba(92,61,46,0.08)',
    padding: '2px 8px',
    borderRadius: 999,
  },
  stageDot: { fontSize: 12 },
  content: {
    fontSize: 13.5,
    lineHeight: 1.45,
    color: '#1C1208',
    whiteSpace: 'pre-wrap',
    flexShrink: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  contentGallery: {
    fontSize: 12.5,
    lineHeight: 1.45,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flexShrink: 0,
  },
  footerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
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
  livingViewMeta: {
    color: '#8C6B3E',
    borderTop: '1px solid rgba(193,127,60,0.18)',
    paddingTop: 6,
  },
}
