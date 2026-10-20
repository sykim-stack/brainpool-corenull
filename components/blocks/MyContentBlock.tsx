'use client'

import { useEffect, useState } from 'react'
import PostBlock, { PostBlockData, PostBlockGrid } from './PostBlock'
import { BRICK_LAYOUT, partitionBrick } from '@/lib/brickLayout'

const DENSITY_MAX = 3

export type MyContentLayout = 'density' | 'brick'

export interface MyContentBlockProps {
  title?: string
  posts: PostBlockData[]
  layout?: MyContentLayout
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void
  emptyLabel?: string
  showInterest?: boolean
  getInterestState?: (postId: string, roomId?: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string, roomId?: string) => void
  onInterestGoLibrary?: () => void
  enableInlineComment?: boolean
  ownerKey?: string
  showHouseName?: boolean
}

export default function MyContentBlock({
  title = '내 방 최신 콘텐츠',
  posts,
  layout = 'density',
  onPostClick,
  onCommentClick,
  emptyLabel = '아직 이야기가 없어요',
  showInterest = false,
  getInterestState,
  interestLoadingId = null,
  onInterestClick,
  onInterestGoLibrary,
  enableInlineComment = false,
  ownerKey,
  showHouseName = true,
}: MyContentBlockProps) {
  const [page, setPage] = useState(0)
  const [wide, setWide] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setWide(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const isBrick = layout === 'brick'
  const pageSize = isBrick
    ? wide
      ? BRICK_LAYOUT.desktop.pageSize
      : BRICK_LAYOUT.mobile.pageSize
    : DENSITY_MAX
  const source = isBrick ? posts : posts.slice(0, DENSITY_MAX)
  const pageCount = isBrick ? Math.max(1, Math.ceil(source.length / pageSize)) : 1
  const needsSwipe = isBrick && source.length > pageSize
  const hasSamplePosts = source.some((post) => post.isSample)

  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1))
  }, [pageCount, page])

  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const visible = isBrick
    ? source.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : source

  const brickRows = isBrick
    ? partitionBrick(visible, wide ? 'desktop' : 'mobile')
    : []

  const renderPost = (post: PostBlockData) => (
    <PostBlock
      key={post.id}
      post={post}
      onClick={() => onPostClick?.(post.id, post.room_id)}
      onCommentClick={() => onCommentClick?.(post.id)}
      showInterest={showInterest}
      interestState={getInterestState?.(post.id, post.room_id) ?? 'none'}
      interestLoading={interestLoadingId === post.id || (!!post.room_id && interestLoadingId === post.room_id)}
      onInterestClick={() => onInterestClick?.(post.id, post.room_id)}
      onInterestGoLibrary={onInterestGoLibrary}
      enableInlineComment={enableInlineComment}
      ownerKey={ownerKey}
      showHouseName={showHouseName}
    />
  )

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        <div style={styles.headerActions}>
          {isBrick && source.length > 0 && !hasSamplePosts && (
            <span style={styles.hint}>
              {needsSwipe
                ? `${safePage + 1}/${pageCount} · ${source.length}개`
                : `${source.length}개`}
            </span>
          )}
          {needsSwipe && (
            <div style={styles.headerArrows}>
              <button
                type="button"
                style={styles.headerArrow}
                onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
                aria-label="이전 게시물 묶음"
              >
                ‹
              </button>
              <button
                type="button"
                style={styles.headerArrow}
                onClick={() => setPage((p) => (p + 1) % pageCount)}
                aria-label="다음 게시물 묶음"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {posts.length === 0 ? (
        <div style={styles.empty}>{emptyLabel}</div>
      ) : isBrick ? (
        <div
          style={styles.brickStage}
          onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => {
            if (!needsSwipe || touchStartX === null) return
            const deltaX = event.changedTouches[0]?.clientX
            if (deltaX === undefined) return
            const distance = deltaX - touchStartX
            if (Math.abs(distance) >= 45) {
              setPage((current) =>
                distance < 0
                  ? (current + 1) % pageCount
                  : (current - 1 + pageCount) % pageCount
              )
            }
            setTouchStartX(null)
          }}
        >
          <div className="cn-brick">
            {brickRows.map((row, ri) => (
              <div
                key={ri}
                className="cn-brick-row"
                data-cols={row.cols}
                data-offset={row.offset ? 'true' : 'false'}
              >
                {row.cards.map((post) => (
                  <div
                    key={post.id}
                    className="cn-post-card"
                    data-large={row.cols === 'large' ? 'true' : 'false'}
                  >
                    {renderPost(post)}
                  </div>
                ))}
              </div>
            ))}
          </div>

        </div>
      ) : !wide ? (
        /* 모바일 density도 2+1 팩 — 마지막 1개 빈칸 방지 */
        <div className="cn-brick">
          {partitionBrick(visible, 'mobile').map((row, ri) => (
            <div
              key={ri}
              className="cn-brick-row"
              data-cols={row.cols}
              data-offset="false"
            >
              {row.cards.map((post) => (
                <div
                  key={post.id}
                  className="cn-post-card"
                  data-large={row.cols === 'large' ? 'true' : 'false'}
                >
                  {renderPost(post)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <PostBlockGrid count={visible.length}>{visible.map(renderPost)}</PostBlockGrid>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: { padding: '16px' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 15,
    fontWeight: 600,
    color: '#2C1810',
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  headerArrows: { display: 'flex', alignItems: 'center', gap: 4 },
  headerArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid rgba(92,61,46,0.16)',
    background: '#FEFCF8',
    color: '#2C1810',
    fontSize: 20,
    lineHeight: '24px',
    padding: 0,
    cursor: 'pointer',
  },
  hint: { fontSize: 11, color: '#9A8470' },
  empty: {
    textAlign: 'center',
    padding: '28px 16px',
    fontSize: 13,
    color: '#9A8470',
    background: '#FEFCF8',
    borderRadius: 14,
    border: '1px dashed rgba(92,61,46,0.15)',
  },
  brickStage: { position: 'relative', touchAction: 'pan-y' },
}
