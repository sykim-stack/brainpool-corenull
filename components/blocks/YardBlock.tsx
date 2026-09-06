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
//   DiscoveryBlock (오늘의 발견, CoreHub 연동) — 옵션. 호출부가
//     본인 집일 때만 데이터를 채워 넣는다(이 블록은 판단 안 함).
//   MyContentBlock (내 방 최신 콘텐츠)
//   NeighborContentBlock (골목, tier='public')
//
// NOTE(2026-09-06): HouseClient.tsx(구버전 /houses/[houseId])에만
// 있던 CoreHub "오늘의 발견" 카드를 여기로 이식. 구버전 폐기로
// 조용히 사라질 뻔한 유일한 실제 기능이었음.
//
// 이 블록은 여전히 fetch하지 않는다 — discoveries/neighbors 배열과
// 클릭 핸들러를 페이지가 계산해서 내려준다.
// ─────────────────────────────────────────────────────────────

export interface DiscoveryItem {
  id: string
  label: string
}

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

  // 오늘의 발견(CoreHub) — 본인 집이 아니면 페이지가 빈 배열을 내려준다.
  discoveries?: DiscoveryItem[]
  onDiscoveryDismiss?: (id: string) => void
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
  discoveries = [],
  onDiscoveryDismiss,
}: YardBlockProps) {
  if (loading) {
    return <div style={styles.loading}>🌳</div>
  }

  return (
    <div>
      <HeroBlock background={background} ring={ring} avatar={avatar} doorplate={doorplate} />

      {discoveries.length > 0 && (
        <section style={styles.discoverySection}>
          <div style={styles.discoveryTitle}>✨ 오늘의 발견</div>
          <div style={styles.discoveryList}>
            {discoveries.map((d) => (
              <div key={d.id} style={styles.discoveryCard}>
                <span style={styles.discoveryText}>{d.label}</span>
                <button
                  style={styles.discoveryDismiss}
                  onClick={() => onDiscoveryDismiss?.(d.id)}
                >✕</button>
              </div>
            ))}
          </div>
        </section>
      )}

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
  discoverySection: {
    padding: '0 16px 4px',
  },
  discoveryTitle: {
    fontSize: 13, fontWeight: 600, color: '#2C1810',
    marginBottom: 8,
  },
  discoveryList: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  discoveryCard: {
    background: 'linear-gradient(135deg, rgba(193,127,60,0.08), rgba(74,82,64,0.06))',
    border: '1px solid rgba(193,127,60,0.2)',
    borderRadius: 12, padding: '12px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  discoveryText: {
    fontSize: 13, color: '#2C1810', lineHeight: 1.5, flex: 1,
  },
  discoveryDismiss: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: '#9A8470', padding: '0 0 0 8px', flexShrink: 0,
  },
}