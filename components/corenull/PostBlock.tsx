'use client'

import MediaRenderer from './MediaRenderer'

// ─────────────────────────────────────────────────────────────
// PostBlock — CoreNull의 기본 콘텐츠 단위.
//
// "CoreNull은 메시지-이미지-시간-댓글, 끝이다." 나머지는 전부 스위치와
// 상위 레이어(Context)일 뿐이다. 이 블록이 마당/거실/서재/방 어디서든
// 콘텐츠를 보여주는 유일한 단위이고, Room Card는 Room을 "탐색"할 때만
// 쓰는 별개 컴포넌트다 (기본 콘텐츠 목록에는 쓰지 않는다).
//
// View Metadata([House]·[Room]·[관계]·[Stage])는 콘텐츠의 제목이 아니라
// 하단에 작게 붙는 부가정보다. Post 본체(메시지/이미지/날짜/댓글)를
// 절대 밀어내지 않는다.
//
// Access Policy와 무관 — 이 블록은 "보여줄 수 있는 데이터가 왔다"는
// 전제 하에 그리기만 한다. 접근 제어는 API 레이어(canReadPost 등)에서
// 이미 끝난 뒤의 결과만 여기로 온다.
// ─────────────────────────────────────────────────────────────

export interface PostBlockViewMeta {
  house_name?: string | null
  room_name?: string | null
  relation?: '나' | '이웃' | '공개' | string | null
  stage_emoji?: string | null // 🌱🌿🌸🍎, 없으면 표시 안 함
}

export interface PostBlockData {
  id: string
  content: string
  media?: { type: 'image' | 'video' | 'audio' | 'pdf' | 'file'; url: string; file?: string }[]
  created_at: string
  comment_count?: number
  view_meta?: PostBlockViewMeta
}

export interface PostBlockProps {
  post: PostBlockData
  onClick?: () => void
  onCommentClick?: () => void
  // 컨텍스트별로 필요 없는 조각을 끌 수 있게 — 새 컴포넌트를 만들지 않고
  // Block 표시 여부만 바꾸는 원칙(Display Policy)을 코드에도 그대로 반영.
  showViewMeta?: boolean
  showComments?: boolean
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

function viewMetaLine(meta?: PostBlockViewMeta) {
  if (!meta) return ''
  const parts = [meta.house_name, meta.room_name, meta.relation].filter(Boolean)
  return parts.join(' · ')
}

export default function PostBlock({
  post,
  onClick,
  onCommentClick,
  showViewMeta = true,
  showComments = true,
}: PostBlockProps) {
  const metaLine = viewMetaLine(post.view_meta)
  const stage = post.view_meta?.stage_emoji

  return (
    <div style={styles.card} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div style={styles.content}>{post.content}</div>

      {post.media && post.media.length > 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          <MediaRenderer media={post.media} />
        </div>
      )}

      <div style={styles.footerRow}>
        <span style={styles.date}>{formatDate(post.created_at)}</span>
        {showComments && (
          <button
            style={styles.commentBtn}
            onClick={(e) => {
              e.stopPropagation()
              onCommentClick?.()
            }}
          >
            💬 {post.comment_count ?? 0}
          </button>
        )}
      </div>

      {showViewMeta && (metaLine || stage) && (
        <div style={styles.viewMeta}>
          {stage && <span style={styles.stageDot}>{stage}</span>}
          <span>{metaLine}</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PostBlockGrid — PostBlock 목록을 반응형으로 배치하는 컨테이너.
// 모바일: 1열 · 태블릿: 2열 · 데스크톱: 4열 (minmax 그리드, 미디어쿼리 불필요)
//
// 주의: 지금 app/layout.tsx가 전체 앱을 max-width:430px 모바일 셸로
// 고정하고 있어서, 이 그리드가 실제로 여러 열로 펼쳐지려면 그 상위
// 제약이 이 화면에서 풀려야 한다. 이 컴포넌트 자체는 컨테이너 폭에
// 맞춰 알아서 반응하도록 만들어뒀다 (상위 제약과 무관하게 동작).
// ─────────────────────────────────────────────────────────────
export function PostBlockGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.grid}>
      {children}
      <style jsx>{`
        div {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
      `}</style>
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
  content: {
    fontSize: 14.5,
    lineHeight: 1.7,
    color: '#1C1208',
    whiteSpace: 'pre-wrap',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: { fontSize: 11, color: '#9A8470' },
  commentBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 12, color: '#9A8470',
    border: 'none', background: 'none', cursor: 'pointer', padding: 0,
  },
  viewMeta: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#9A8470',
    paddingTop: 8, borderTop: '1px solid rgba(92,61,46,0.08)',
  },
  stageDot: { fontSize: 12 },
  grid: {},
}