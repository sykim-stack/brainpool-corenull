'use client'

import { useEffect, useState } from 'react'

/**
 * PosterView — 방의 현재 상태를 압축한 현관 (거실 핵심)
 * 6필드: 방 목적 · 최근 내용 · 이미지 · 작성일 · 상태 · 관심
 */
export interface PosterData {
  roomId: string
  roomName: string
  status?: string | null
  stageEmoji?: string | null
  recentContent?: string | null
  imageUrl?: string | null
  createdAt?: string | null
  houseName?: string | null
}

export interface PosterBlockProps {
  poster: PosterData
  onClick?: () => void
  showInterest?: boolean
  interestActive?: boolean
  onInterestClick?: () => void
}

function formatDate(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function PosterBlock({
  poster,
  onClick,
  showInterest = false,
  interestActive = false,
  onInterestClick,
}: PosterBlockProps) {
  const preview = (poster.recentContent || '').slice(0, 80)
  const hasMore = (poster.recentContent || '').length > 80

  return (
    <div style={styles.card} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div style={styles.head}>
        <span style={styles.roomName}>{poster.roomName}</span>
        {(poster.status || poster.stageEmoji) && (
          <span style={styles.status}>
            {poster.stageEmoji ? `${poster.stageEmoji} ` : ''}
            {poster.status}
          </span>
        )}
      </div>

      <div style={styles.media}>
        {poster.imageUrl ? (
          <img src={poster.imageUrl} alt="" style={styles.img} />
        ) : (
          <div style={styles.mediaEmpty}>🚪</div>
        )}
      </div>

      {preview ? (
        <p style={styles.content}>
          {preview}
          {hasMore ? '…' : ''}
        </p>
      ) : (
        <p style={styles.contentMuted}>아직 이야기가 없어요</p>
      )}

      <div style={styles.foot}>
        <span style={styles.date}>{formatDate(poster.createdAt)}</span>
        {showInterest && (
          <button
            type="button"
            style={{
              ...styles.interest,
              color: interestActive ? '#C17F3C' : '#9A8470',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onInterestClick?.()
            }}
          >
            {interestActive ? '● 관심' : '○ 관심'}
          </button>
        )}
      </div>
    </div>
  )
}

export function PosterRow({
  title = '이 집의 방',
  posters,
  onPosterClick,
  showInterest,
  getInterestActive,
  onInterestClick,
}: {
  title?: string
  posters: PosterData[]
  onPosterClick?: (roomId: string) => void
  showInterest?: boolean
  getInterestActive?: (roomId: string) => boolean
  onInterestClick?: (roomId: string) => void
}) {
  const [page, setPage] = useState(0)
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setWide(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const pageSize = wide ? 3 : 1
  const pageCount = Math.max(1, Math.ceil(posters.length / pageSize))

  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1))
  }, [pageCount, page])

  const visible = posters.slice(page * pageSize, page * pageSize + pageSize)

  if (posters.length === 0) {
    return (
      <section style={styles.section}>
        <div style={styles.sectionTitle}>{title}</div>
        <div style={styles.empty}>아직 열린 방이 없어요</div>
      </section>
    )
  }

  return (
    <section style={styles.section}>
      <div style={styles.sectionHead}>
        <span style={styles.sectionTitle}>{title}</span>
        {pageCount > 1 && (
          <span style={styles.hint}>
            {page + 1} / {pageCount}
          </span>
        )}
      </div>
      <div
        className="cn-post-grid"
        data-count={visible.length <= 1 ? '1' : visible.length === 2 ? '2' : '3'}
      >
        {visible.map((p) => (
          <PosterBlock
            key={p.roomId}
            poster={p}
            onClick={() => onPosterClick?.(p.roomId)}
            showInterest={showInterest}
            interestActive={getInterestActive?.(p.roomId)}
            onInterestClick={() => onInterestClick?.(p.roomId)}
          />
        ))}
      </div>
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
            />
          ))}
        </div>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: { padding: '16px' },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
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
  card: {
    background: '#FEFCF8',
    borderRadius: 16,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: 12,
    boxShadow: '0 2px 12px rgba(44,24,16,0.06)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  roomName: { fontSize: 13, fontWeight: 600, color: '#2C1810', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  status: {
    fontSize: 10,
    color: '#5C4A35',
    background: 'rgba(92,61,46,0.08)',
    padding: '2px 8px',
    borderRadius: 999,
    flexShrink: 0,
  },
  media: {
    width: '100%',
    aspectRatio: '4 / 3',
    borderRadius: 12,
    overflow: 'hidden',
    background: 'rgba(92,61,46,0.06)',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  mediaEmpty: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    color: '#9A8470',
  },
  content: { fontSize: 13, lineHeight: 1.55, color: '#1C1208', margin: 0 },
  contentMuted: { fontSize: 12, color: '#9A8470', margin: 0 },
  foot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 11, color: '#9A8470' },
  interest: {
    border: 'none',
    background: 'none',
    fontSize: 12,
    cursor: 'pointer',
    padding: '4px 6px',
  },
  dots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
}
