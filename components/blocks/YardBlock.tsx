'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// YardBlock — 마당 화면을 조립하는 블록.
//
// §2(마당 Block 구성):
//   HeroBlock (배경=외부) + Ring + Doorplate
//   MyContentBlock (내 방 최신 콘텐츠)
//   NeighborContentBlock (골목, tier='public')
//
// NOTE(2026-09-05): ADR-ACCESS-002 승인 완료 — 게이트 해제.
// 이전엔 NeighborContentBlock을 만들지도 import하지도 않았지만,
// 이제 실제로 조립한다. tier는 골목 고정('public') — 복도(거실)는
// LivingBlock 쪽에서 별도로 'invite'로 연결한다.
//
// 이 블록은 여전히 fetch하지 않는다 — neighbors 배열과 클릭
// 핸들러를 페이지가 계산해서 내려준다.
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

  // 골목 — accepted 상태만 걸러서 페이지가 내려준다(이 블록은 필터링 안 함).
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

      {onNeighborClick && (
        <NeighborContentBlock
          tier="public"
          neighbors={neighbors}
          onNeighborClick={onNeighborClick}
        />
      )}
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