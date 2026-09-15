'use client'

import { useEffect, useState } from 'react'
import PostBlock, { PostBlockData, PostBlockGrid } from './PostBlock'

/** 모바일 마당: 한 장씩, 점은 최대 노출 페이지용 */
const PAGE_SIZE = 1

export interface MyContentBlockProps {
  title?: string
  posts: PostBlockData[]
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void
  emptyLabel?: string
  showInterest?: boolean
  getInterestState?: (postId: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string) => void
  onInterestGoLibrary?: () => void
  enableInlineComment?: boolean
  ownerKey?: string
  showHouseName?: boolean
}

export default function MyContentBlock({
  title = '내 방 최신 콘텐츠',
  posts,
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
  // 점 스와이프는 최대 3페이지 분(방 최신 3개) 기준
  const capped = posts.slice(0, 3)
  const pageCount = Math.max(1, capped.length)

  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1))
  }, [pageCount, page])

  const visible = capped.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {capped.length > 1 && (
          <span style={styles.hint}>
            {page + 1} / {capped.length}
          </span>
        )}
      </div>

      {posts.length === 0 ? (
        <div style={styles.empty}>{emptyLabel}</div>
      ) : (
        <>
          <PostBlockGrid count={1}>
            {visible.map((post) => (
              <PostBlock
                key={post.id}
                post={post}
                onClick={() => onPostClick?.(post.id, post.room_id)}
                onCommentClick={() => onCommentClick?.(post.id)}
                showInterest={showInterest}
                interestState={getInterestState?.(post.id) ?? 'none'}
                interestLoading={interestLoadingId === post.id}
                onInterestClick={() => onInterestClick?.(post.id)}
                onInterestGoLibrary={onInterestGoLibrary}
                enableInlineComment={enableInlineComment}
                ownerKey={ownerKey}
                showHouseName={showHouseName}
              />
            ))}
          </PostBlockGrid>

          {pageCount > 1 && (
            <div style={styles.dots}>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  style={{
                    ...styles.dot,
                    background: i === page ? '#2C1810' : 'rgba(92,61,46,0.2)',
                  }}
                  onClick={() => setPage(i)}
                  aria-label={`페이지 ${i + 1}`}
                />
              ))}
            </div>
          )}
        </>
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
