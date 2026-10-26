'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { PostBlockData } from './PostBlock'
import { RingData } from './RingBlock'

/**
 * LivingBlock — 거실 (구조 닫음)
 * Hero → 복도(골목 블록 · 방 1개) → 최신글 brick 3-2-3-2-3
 * 문패 CTA = 방 만들기
 */

export interface LivingBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate
  heroControls?: React.ReactNode
  avatarControls?: React.ReactNode

  /** 복도용 — 보통 이 집 1칩 + rooms[] */
  corridor: NeighborChip[]
  onCorridorHouseClick?: (houseId: string) => void
  onCorridorRoomClick?: (roomId: string) => void

  roomViews: PostBlockData[]
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void

  loading?: boolean
  showInterest?: boolean
  getInterestState?: (postId: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string) => void
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
  avatarControls,
  corridor,
  onCorridorHouseClick,
  onCorridorRoomClick,
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
        avatarControls={avatarControls}
      />

      <NeighborContentBlock
        tier="invite"
        mode="neighbor"
        neighbors={corridor}
        roomsPerPage={1}
        emptyLabel="아직 방이 없어요"
        onNeighborClick={(id) => onCorridorHouseClick?.(id)}
        onRoomEnter={onCorridorRoomClick}
        onPostClick={onPostClick}
      />

      <MyContentBlock
        title="최신글"
        layout="brick"
        cardTone="living"
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
