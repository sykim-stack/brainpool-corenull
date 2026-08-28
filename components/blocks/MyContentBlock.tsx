'use client'

import PostBlock, { PostBlockData, PostBlockGrid } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// MyContentBlock — "내 방 최신 콘텐츠" / "최근 이야기" 섹션.
//
// PostBlock을 그대로 쓰는 얇은 래퍼일 뿐이다. 새 카드 디자인을
// 만들지 않는다 — Post 표현은 Card(PostBlock)/Compact 2종류로
// 이미 확정했고, 이 섹션은 Card를 쓴다.
//
// fetch 없음. posts 배열은 호출부(마당/거실 페이지)가 API에서
// 가져와서 내려준다. 이 블록은 "무엇을 보여줄지"만 안다.
// ─────────────────────────────────────────────────────────────

export interface MyContentBlockProps {
  title?: string // 예: '내 방 최신 콘텐츠', '최근 이야기'
  posts: PostBlockData[]
  onPostClick?: (postId: string) => void
  onCommentClick?: (postId: string) => void
  emptyLabel?: string // posts가 비었을 때 문구
}

export default function MyContentBlock({
  title = '내 방 최신 콘텐츠',
  posts,
  onPostClick,
  onCommentClick,
  emptyLabel = '아직 이야기가 없어요',
}: MyContentBlockProps) {
  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
      </div>

      {posts.length === 0 ? (
        <div style={styles.empty}>{emptyLabel}</div>
      ) : (
        <PostBlockGrid>
          {posts.map((post) => (
            <PostBlock
              key={post.id}
              post={post}
              onClick={() => onPostClick?.(post.id)}
              onCommentClick={() => onCommentClick?.(post.id)}
            />
          ))}
        </PostBlockGrid>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    color: '#9A8470',
    letterSpacing: '0.5px',
  },
  empty: {
    textAlign: 'center',
    padding: '32px 16px',
    fontSize: 13,
    color: '#9A8470',
    background: '#FEFCF8',
    borderRadius: 14,
    border: '1px dashed rgba(92,61,46,0.15)',
  },
}