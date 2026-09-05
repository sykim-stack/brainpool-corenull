'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// YardBlock — 마당 화면 전체를 조립하는 블록.
//
// §2(마당 Block 구성) 기준:
//   HeroBlock (배경=외부) + Ring + Doorplate
//   MyContentBlock (내 방 최신 콘텐츠)
//   NeighborContentBlock (골목, tier="public") — ADR-ACCESS-002 승인 완료로 조립
//
// 이 블록은 "마당 페이지" 그 자체이므로 데이터 로딩 책임을 진다
// (HeroBlock/MyContentBlock/NeighborContentBlock 자체는 여전히
// fetch하지 않는 순수 컴포넌트다 — 여기서 가져온 데이터를 props로
// 내려줄 뿐).
// ─────────────────────────────────────────────────────────────

export interface YardBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate
  posts: PostBlockData[]
  onPostClick?: (postId: string) => void
  onCommentClick?: (postId: string) => void
  loading?: boolean

  showInterest?: boolean
  getInterestState?: (postId: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string) => void

  // ADR-ACCESS-002 — accepted 관계만 호출부가 걸러서 넘긴다.
  neighbors?: NeighborChip[]
  onNeighborClick?: (houseId: string) => void
}

export default function YardBlock({
  background,
  ring,
  avatar,
  doorplate,
  posts,
  onPostClick,
  onCommentClick,
  loading = false,
  showInterest = false,
  getInterestState,
  interestLoadingId = null,
  onInterestClick,
  neighbors = [],
  onNeighborClick,
}: YardBlockProps) {
  if (loading) {
    return <div style={styles.loading}>🌳</div>
  }

  return (
    <div>
      <HeroBlock background={background} ring={ring} avatar={avatar} doorplate={doorplate} />

      <MyContentBlock
        title="내 방 최신 콘텐츠"
        posts={posts}
        onPostClick={onPostClick}
        onCommentClick={onCommentClick}
        showInterest={showInterest}
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={onInterestClick}
      />

      <NeighborContentBlock
        tier="public"
        neighbors={neighbors}
        onNeighborClick={(houseId) => onNeighborClick?.(houseId)}
      />
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
}