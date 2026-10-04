'use client'

import { useEffect, useState } from 'react'
import PostBlock, { PostBlockData, PostBlockGrid } from './PostBlock'

const DENSITY_MAX = 3
const BRICK_PAGE_DESKTOP = 10
const BRICK_PAGE_MOBILE = 6
/** PC: 3-2-3-2 / 모바일: 2칸 우선·남은 1칸 가로 풀 */
const BRICK_PATTERN_DESKTOP = [3, 2, 3, 2]
const BRICK_PATTERN_MOBILE = [2, 1]

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

/** PC: pattern 반복. 모바일: 2칸 우선, 남는 1칸은 가로 풀(빈 공간 없음)
 *  1→길게 / 2→나란히 / 3→2+1 */
function partitionBrick<T>(
  items: T[],
  pattern: number[],
  mobile = false
): { cards: T[]; cols: string; offset: boolean }[] {
  const rows: { cards: T[]; cols: string; offset: boolean }[] = []
  let i = 0
  if (mobile) {
    while (i < items.length) {
      const left = items.length - i
      const take = left === 1 ? 1 : 2
      const cards = items.slice(i, i + take)
      const cols = cards.length === 1 ? 'large' : '2'
      rows.push({ cards, cols, offset: false })
      i += cards.length
    }
    return rows
  }
  let pi = 0
  let prevCols = ''
  while (i < items.length) {
    const want = pattern[pi % pattern.length]
    const cards = items.slice(i, i + want)
    const cols = cards.length === 1 ? 'large' : cards.length === 3 ? '3' : '2'
    rows.push({ cards, cols, offset: cols === '2' && prevCols === '3' })
    prevCols = cols
    i += cards.length
    pi++
  }
  return rows
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

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setWide(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const isBrick = layout === 'brick'
  const pageSize = isBrick ? (wide ? BRICK_PAGE_DESKTOP : BRICK_PAGE_MOBILE) : DENSITY_MAX
  const source = isBrick ? posts : posts.slice(0, DENSITY_MAX)
  const pageCount = isBrick ? Math.max(1, Math.ceil(source.length / pageSize)) : 1
  const needsSwipe = isBrick && source.length > pageSize

  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1))
  }, [pageCount, page])

  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const visible = isBrick
    ? source.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : source

  const brickRows = isBrick
    ? partitionBrick(visible, wide ? BRICK_PATTERN_DESKTOP : BRICK_PATTERN_MOBILE, !wide)
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
        {isBrick && source.length > 0 && (
          <span style={styles.hint}>
            {needsSwipe
              ? `${safePage + 1}/${pageCount} · ${source.length}개`
              : `${source.length}개`}
          </span>
        )}
      </div>

      {posts.length === 0 ? (
        <div style={styles.empty}>{emptyLabel}</div>
      ) : isBrick ? (
        <div style={styles.brickStage}>
          {needsSwipe && (
            <>
              <button
                type="button"
                style={{ ...styles.setArrow, left: 0 }}
                onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
                aria-label="이전"
              >
                ‹
              </button>
              <button
                type="button"
                style={{ ...styles.setArrow, right: 0 }}
                onClick={() => setPage((p) => (p + 1) % pageCount)}
                aria-label="다음"
              >
                ›
              </button>
            </>
          )}

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

          {needsSwipe && (
            <div style={styles.dots}>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  style={{
                    ...styles.dot,
                    background: i === safePage ? '#2C1810' : 'rgba(92,61,46,0.2)',
                  }}
                  onClick={() => setPage(i)}
                  aria-label={`페이지 ${i + 1}`}
                />
              ))}
            </div>
          )}
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
  brickStage: { position: 'relative' },
  setArrow: {
    position: 'absolute',
    top: '40%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    width: 28,
    height: 36,
    borderRadius: 10,
    border: '1px solid rgba(92,61,46,0.12)',
    background: 'rgba(254,252,248,0.95)',
    color: '#2C1810',
    fontSize: 20,
    lineHeight: '36px',
    padding: 0,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(44,24,16,0.08)',
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
}
