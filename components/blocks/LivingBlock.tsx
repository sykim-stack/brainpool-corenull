'use client'

import { useEffect, useState } from 'react'
import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import PostBlock, { PostBlockData } from './PostBlock'
import { PosterRow, PosterData } from './PosterBlock'
import { RingData } from './RingBlock'

/**
 * LivingBlock — 거실
 * 방 = 공간 고르기 (Poster)
 * 최신글 = 광장과 동일 리듬 (최대 6, 초과 시 스와이프)
 */

const LATEST_PAGE = 6

export interface LivingBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate

  posters: PosterData[]
  onPosterClick?: (roomId: string) => void

  roomViews: PostBlockData[]
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void

  loading?: boolean
  showInterest?: boolean
  getInterestState?: (postId: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string) => void
  onInterestGoLibrary?: () => void

  showPosterInterest?: boolean
  getPosterInterestActive?: (roomId: string) => boolean
  onPosterInterestClick?: (roomId: string) => void

  enableInlineComment?: boolean
  ownerKey?: string

  onCreateRoomClick?: () => void
}

export default function LivingBlock({
  background,
  ring,
  avatar,
  doorplate,
  posters,
  onPosterClick,
  roomViews,
  onPostClick,
  onCommentClick,
  loading = false,
  showInterest = false,
  getInterestState,
  interestLoadingId = null,
  onInterestClick,
  onInterestGoLibrary,
  showPosterInterest = false,
  getPosterInterestActive,
  onPosterInterestClick,
  enableInlineComment = false,
  ownerKey,
  onCreateRoomClick,
}: LivingBlockProps) {
  const [latestPage, setLatestPage] = useState(0)

  const needsSwipe = roomViews.length > LATEST_PAGE
  const pageCount = needsSwipe ? Math.ceil(roomViews.length / LATEST_PAGE) : 1
  const safePage = Math.min(latestPage, Math.max(0, pageCount - 1))
  const visible =
    needsSwipe
      ? roomViews.slice(safePage * LATEST_PAGE, safePage * LATEST_PAGE + LATEST_PAGE)
      : roomViews

  useEffect(() => {
    if (latestPage >= pageCount) setLatestPage(Math.max(0, pageCount - 1))
  }, [pageCount, latestPage])

  const gridCount =
    visible.length >= 3 ? 'many' : String(Math.max(1, visible.length))

  if (loading) {
    return <div style={styles.loading}>🛋️</div>
  }

  return (
    <div>
      <HeroBlock background={background} ring={ring} avatar={avatar} doorplate={doorplate} />

      {onCreateRoomClick && (
        <div style={styles.createRow}>
          <button type="button" style={styles.createBtn} onClick={onCreateRoomClick}>
            + 방 만들기
          </button>
        </div>
      )}

      <PosterRow
        title="방"
        posters={posters}
        onPosterClick={onPosterClick}
        showInterest={showPosterInterest}
        getInterestActive={getPosterInterestActive}
        onInterestClick={onPosterInterestClick}
      />

      <section style={styles.latestSection}>
        <div style={styles.latestHeader}>
          <span style={styles.latestTitle}>최신글</span>
          {roomViews.length > 0 && (
            <span style={styles.latestHint}>
              {needsSwipe
                ? `${safePage + 1}/${pageCount} · 더보기`
                : `${roomViews.length}개`}
            </span>
          )}
        </div>

        {roomViews.length === 0 ? (
          <div style={styles.empty}>아직 이야기가 없어요</div>
        ) : (
          <div style={styles.latestStage}>
            {needsSwipe && (
              <>
                <button
                  type="button"
                  style={{ ...styles.arrow, left: 0 }}
                  onClick={() => setLatestPage((p) => (p - 1 + pageCount) % pageCount)}
                  aria-label="이전"
                >
                  ‹
                </button>
                <button
                  type="button"
                  style={{ ...styles.arrow, right: 0 }}
                  onClick={() => setLatestPage((p) => (p + 1) % pageCount)}
                  aria-label="다음"
                >
                  ›
                </button>
              </>
            )}

            <div className="cn-post-grid" data-count={gridCount}>
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
                  showHouseName
                />
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
                    onClick={() => setLatestPage(i)}
                    aria-label={`페이지 ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    fontSize: 40,
  },
  createRow: {
    padding: '12px 16px 0',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  createBtn: {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1px dashed rgba(92,61,46,0.25)',
    background: 'none',
    color: '#9A8470',
    fontSize: 13,
    cursor: 'pointer',
  },
  latestSection: {
    padding: '8px 16px 28px',
    borderTop: '1px solid rgba(92,61,46,0.08)',
  },
  latestHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  latestTitle: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 15,
    fontWeight: 600,
    color: '#2C1810',
  },
  latestHint: { fontSize: 11, color: '#9A8470' },
  empty: {
    textAlign: 'center',
    padding: '28px 16px',
    fontSize: 13,
    color: '#9A8470',
    background: '#FEFCF8',
    borderRadius: 14,
    border: '1px dashed rgba(92,61,46,0.15)',
  },
  latestStage: { position: 'relative' },
  arrow: {
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
    marginTop: 14,
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
