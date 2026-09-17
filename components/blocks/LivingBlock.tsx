'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import { PosterRow, PosterData } from './PosterBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

/**
 * LivingBlock — 거실
 *
 * 마당: 발견 · 관계 · 골목
 * 거실: 현관(Poster) · 방 고르기 · 이웃공개 최신 RoomView
 *
 * A Hero(living) → B 문패(Hero 내) → C Poster 열 → D RoomView 최신
 */

export interface LivingBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate

  /** 이 집의 방 · PosterView */
  posters: PosterData[]
  onPosterClick?: (roomId: string) => void

  /** 이웃공개(및 공개) 방 최신 RoomView — 방당 1, 최대 3 권장 */
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
        title="이 집의 방"
        posters={posters}
        onPosterClick={onPosterClick}
        showInterest={showPosterInterest}
        getInterestActive={getPosterInterestActive}
        onInterestClick={onPosterInterestClick}
      />

      <MyContentBlock
        title="최신 이야기"
        posts={roomViews}
        onPostClick={onPostClick}
        onCommentClick={onCommentClick}
        emptyLabel="아직 이웃과 나눌 이야기가 없어요"
        showInterest={showInterest}
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={onInterestClick}
        onInterestGoLibrary={onInterestGoLibrary}
        enableInlineComment={enableInlineComment}
        ownerKey={ownerKey}
        showHouseName
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
}
