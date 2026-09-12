'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// YardBlock — 마당 화면을 조립하는 블록.
//
// 구조: Hero → 오늘의 발견 → 골목 1|2|3 → 내 방 최신 콘텐츠
// 골목: NeighborContentBlock (화살표=이웃, 점=방)
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

  neighbors?: NeighborChip[]
  onNeighborClick?: (houseId: string) => void

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

      {onNeighborClick && (
        <NeighborContentBlock
          tier="public"
          neighbors={neighbors}
          onNeighborClick={onNeighborClick}
          onPostClick={onPostClick}
        />
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
