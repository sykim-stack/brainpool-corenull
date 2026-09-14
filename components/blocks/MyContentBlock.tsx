'use client'

import PostBlock, { PostBlockData, PostBlockGrid } from './PostBlock'

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
  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
      </div>

      {posts.length === 0 ? (
        <div style={styles.empty}>{emptyLabel}</div>
      ) : (
        <PostBlockGrid single={posts.length === 1}>
          {posts.map((post) => (
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
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: { padding: '16px' },
  header: { display: 'flex', alignItems: 'center', marginBottom: 10 },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 15,
    fontWeight: 600,
    color: '#2C1810',
  },
  empty: {
    textAlign: 'center',
    padding: '28px 16px',
    fontSize: 13,
    color: '#9A8470',
    background: '#FEFCF8',
    borderRadius: 14,
    border: '1px dashed rgba(92,61,46,0.15)',
  },
}
