'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { PostBlockData } from './PostBlock'
import { RingData } from './RingBlock'

/**
 * LivingBlock — 거실 (구조 닫음)
 * Hero → 복도(골목 블록 · 방 1개) → 최신글 brick 3-2-3
 * 문패 CTA = 방 만들기
 */

export interface LivingBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate
  heroControls?: React.ReactNode

  /** 복도용 — 보통 이 집 1칩 + rooms[] */
  corridor: NeighborChip[]
  onCorridorHouseClick?: (houseId: string) => void

  roomViews: PostBlockData[]
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void

  loading?: boolean
  showInterest?: boolean
  getInterestState?: (postId: string, roomId?: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string, roomId?: string) => void
  onInterestGoLibrary?: () => void

  enableInlineComment?: boolean
  ownerKey?: string
}

export default function LivingBlock({
  background,
  ring,
  avatar,
  doorplate,
  heroControls,
  corridor,
  onCorridorHouseClick,
  roomViews,
  onPostClick,
  onCommentClick,
  loading = false,
  showInterest = false,
  getInterestState,
  interestLoadingId = null,
  onInterestClick,
  onInterestGoLibrary,
  enableInlineComment = false,
  ownerKey,
}: LivingBlockProps) {
  if (loading) {
    return <div style={styles.loading}>🛋️</div>
  }

  return (
    <div>
      <HeroBlock
        background={background}
        ring={ring}
        avatar={avatar}
        doorplate={doorplate}
        heroControls={heroControls}
      />

      {/* 복도 = 골목 블록 · 방 1개씩 */}
      <NeighborContentBlock
        tier="invite"
        mode="neighbor"
        neighbors={corridor}
        roomsPerPage={1}
        emptyLabel="아직 방이 없어요"
        onNeighborClick={(id) => onCorridorHouseClick?.(id)}
        onPostClick={onPostClick}
        showInterest={showInterest}
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={onInterestClick}
        onInterestGoLibrary={onInterestGoLibrary}
        enableInlineComment={enableInlineComment}
        ownerKey={ownerKey}
        showViewMeta
        showComments
      />

      {/* 최신글 = 광장/마당과 동일 벽돌 3-2-3 */}
      <MyContentBlock
        title="최신글"
        layout="brick"
        posts={roomViews}
        onPostClick={onPostClick}
        onCommentClick={onCommentClick}
        showInterest={showInterest}
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={onInterestClick}
        onInterestGoLibrary={onInterestGoLibrary}
        enableInlineComment={enableInlineComment}
        ownerKey={ownerKey}
        emptyLabel="아직 이야기가 없어요"
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
