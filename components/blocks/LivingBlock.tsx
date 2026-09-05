'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// LivingBlock — 거실 화면을 조립하는 블록.
//
// §3 결정: 거실은 마당과 완전히 동일한 Hero+Doorplate+Ring 구조를
// 쓴다. 차이는 배경(외부→내부)과, 방 발견 대신 "방 관리"(방탭·
// 필터탭·방만들기)가 붙는다는 것뿐이다. HeroBlock을 그대로 재사용.
//
// NeighborContentBlock (복도, tier="invite") — ADR-ACCESS-002
// 승인 완료로 조립.
// ─────────────────────────────────────────────────────────────

export interface RoomTab {
  id: string
  label: string
  badge?: string
}

export interface FilterChip {
  key: string
  label: string
}

export interface LivingBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate

  rooms: RoomTab[]
  selectedRoomId: string | null
  onRoomSelect: (roomId: string) => void
  onCreateRoomClick: () => void

  visibilityFilters: FilterChip[]
  selectedVisibility: string
  onVisibilityChange: (key: string) => void

  stageFilters: FilterChip[]
  selectedStage: string
  onStageChange: (key: string) => void

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

export default function LivingBlock({
  background,
  ring,
  avatar,
  doorplate,
  rooms,
  selectedRoomId,
  onRoomSelect,
  onCreateRoomClick,
  visibilityFilters,
  selectedVisibility,
  onVisibilityChange,
  stageFilters,
  selectedStage,
  onStageChange,
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
}: LivingBlockProps) {
  if (loading) {
    return <div style={styles.loading}>🛋️</div>
  }

  return (
    <div>
      <HeroBlock background={background} ring={ring} avatar={avatar} doorplate={doorplate} />

      {/* 방 탭 — 방 관리는 거실에만 있다 */}
      <div style={styles.roomRow}>
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room.id)}
            style={{
              ...styles.roomChip,
              ...(room.id === selectedRoomId ? styles.roomChipActive : {}),
            }}
          >
            {room.label}
            {room.badge && <span style={{ marginLeft: 4 }}>{room.badge}</span>}
          </button>
        ))}
        <button style={styles.createRoomChip} onClick={onCreateRoomClick}>
          + 방 만들기
        </button>
      </div>

      {/* 공개범위 필터 */}
      {visibilityFilters.length > 0 && (
        <div style={styles.filterRow}>
          {visibilityFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => onVisibilityChange(filter.key)}
              style={{
                ...styles.filterChip,
                ...(filter.key === selectedVisibility ? styles.filterChipActive : {}),
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* 성장단계 필터 — 공개범위와 완전히 독립된 축 */}
      {stageFilters.length > 0 && (
        <div style={{ ...styles.filterRow, paddingTop: 6 }}>
          {stageFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => onStageChange(filter.key)}
              style={{
                ...styles.filterChip,
                ...(filter.key === selectedStage ? styles.filterChipActive : {}),
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      <MyContentBlock
        title="이 방의 이야기"
        posts={posts}
        onPostClick={onPostClick}
        onCommentClick={onCommentClick}
        showInterest={showInterest}
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={onInterestClick}
      />

      <NeighborContentBlock
        tier="invite"
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
  roomRow: {
    display: 'flex',
    gap: 8,
    padding: '14px 16px 0',
    flexWrap: 'wrap',
  },
  roomChip: {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1px solid rgba(92,61,46,0.15)',
    background: '#F5F0E8',
    color: '#5C4A35',
    fontSize: 13,
    cursor: 'pointer',
  },
  roomChipActive: {
    background: '#2C1810',
    color: '#FBF8F2',
    border: '1px solid #2C1810',
  },
  createRoomChip: {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1px dashed rgba(92,61,46,0.25)',
    background: 'none',
    color: '#9A8470',
    fontSize: 13,
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    padding: '10px 16px 0',
    flexWrap: 'wrap',
  },
  filterChip: {
    padding: '6px 12px',
    borderRadius: 16,
    border: '1px solid rgba(92,61,46,0.12)',
    background: '#FEFCF8',
    color: '#9A8470',
    fontSize: 12,
    cursor: 'pointer',
  },
  filterChipActive: {
    background: 'rgba(193,127,60,0.12)',
    color: '#C17F3C',
    border: '1px solid rgba(193,127,60,0.3)',
  },
}