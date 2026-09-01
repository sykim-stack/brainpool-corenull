'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// LivingBlock — 거실 화면을 조립하는 블록.
//
// §3 결정: 거실은 마당과 완전히 동일한 Hero+Doorplate+Ring 구조를
// 쓴다. 차이는 배경(외부→내부)과, 방 발견 대신 "방 관리"(방탭·
// 필터탭·방만들기)가 붙는다는 것뿐이다. HeroBlock을 그대로 재사용.
//
// 원래 있던 문제(마당 화면에 방탭/필터탭/방만들기가 잘못 섞여
// 들어갔던 것)의 해결책이 이 블록이다 — 이 기능들은 여기에만 있고
// YardBlock에는 없다.
//
// 방탭/필터탭의 "의미"(무엇이 씨앗이고 무엇이 열매인지 등)는 이
// 블록이 판단하지 않는다. 그냥 라벨+선택상태를 받아서 그릴 뿐이고,
// 실제 필터링된 posts를 만드는 건 호출부(페이지) 책임이다.
// ─────────────────────────────────────────────────────────────

export interface RoomTab {
  id: string
  label: string
  badge?: string // 예: 🌱 (seed_mode 표시 등), 없으면 표시 안 함
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

  // 두 개의 독립된 축 — 공개범위와 성장단계는 서로 무관하게 조합 가능
  // (예: 공개+씨드, 이웃공개+참여, 비공개+열매 전부 유효한 조합).
  // 참여(Participation)는 필터 축이 아니라 room 자체의 속성이라
  // RoomTab의 badge로 표시한다 — 여기 필터 목록엔 없다.
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

      {/*
        NeighborContentBlock 자리 — ADR-ACCESS-002 승인 전까지 OFF.
        게이트 풀리면 여기에 <NeighborContentBlock tier="invite" .../> 하나만 추가
        (§5-6: 복도의 거주지는 거실).
      */}
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