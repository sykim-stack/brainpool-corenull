'use client'

import { PostBlockData } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// PostCompactRow — Post의 두 번째(마지막) 표현 형태.
//
// Card(PostBlock)와 완전히 같은 PostBlockData를 쓴다 — 데이터가
// 다른 게 아니라 표현만 다르다 (Master View §8: Content는 하나,
// View가 다르게 보여줄 뿐). 새 데이터 타입을 만들지 않는다.
//
// 대상: me/posts(내가 쓴 이야기), 서재 내글탭 — "훑어보기" 용도라
// 미디어 원본 대신 썸네일 하나, 본문 대신 2줄 미리보기만 보여준다.
//
// PostBlock에 있는 관심/댓글/viewMeta 같은 조각은 여기 없다 —
// Compact는 훑어보기 전용이고, 상세 상호작용은 클릭해서 들어간
// Card(상세 페이지)에서 하면 된다는 것이 원래 설계 의도.
// 뱃지(보관됨/재탄생/열매 등)만 최소한으로 지원한다.
// ─────────────────────────────────────────────────────────────

export interface PostCompactRowProps {
  post: PostBlockData
  thumbnailUrl?: string | null // media[0]이 image일 때 호출부가 뽑아서 넘김
  badges?: string[] // 예: ['보관됨'], ['재탄생'] — 필요한 것만
  onClick?: () => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function PostCompactRow({ post, thumbnailUrl, badges = [], onClick }: PostCompactRowProps) {
  const preview = post.content?.slice(0, 60) || ''
  const hasMore = (post.content?.length || 0) > 60

  return (
    <div style={styles.row} onClick={onClick} role={onClick ? 'button' : undefined}>
      {thumbnailUrl && <img src={thumbnailUrl} alt="" style={styles.thumb} />}

      <div style={styles.info}>
        <p style={styles.content}>
          {preview}{hasMore ? '…' : ''}
        </p>
        <div style={styles.metaRow}>
          {badges.map((b) => (
            <span key={b} style={styles.badge}>{b}</span>
          ))}
          <span style={styles.date}>{formatDate(post.created_at)}</span>
        </div>
      </div>

      <span style={styles.arrow}>›</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    background: '#FEFCF8',
    borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  content: {
    fontSize: 13,
    color: '#1C1208',
    lineHeight: 1.5,
    margin: '0 0 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    fontSize: 10,
    color: '#C17F3C',
    background: 'rgba(193,127,60,0.1)',
    padding: '2px 6px',
    borderRadius: 6,
  },
  date: { fontSize: 11, color: '#9A8470' },
  arrow: { fontSize: 16, color: '#9A8470', flexShrink: 0 },
}