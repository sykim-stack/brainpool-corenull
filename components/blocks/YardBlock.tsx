'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

// YardBlock — 마당
// Hero → 오늘의 발견 → 골목 1|2|3(발견+신청) → 관계 관리 → 이웃 공개방 최신 → 내 방 최신
// Poster 없음 (거실)

export interface DiscoveryItem {
  id: string
  label: string
}

export interface YardRelationRow {
  id: string
  status: 'pending' | 'accepted'
  direction: 'outgoing' | 'incoming'
  title: string
  houseId?: string
}

export interface YardBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate
  loading?: boolean
  discoveries?: DiscoveryItem[]
  onDiscoveryDismiss?: (id: string) => void
  recommended?: NeighborChip[]
  onRecommendHouseClick?: (houseId: string) => void
  onApplyNeighbor?: (houseId: string) => void
  applyLoadingHouseId?: string | null
  relations?: YardRelationRow[]
  onAcceptRelation?: (neighborId: string) => void
  onRemoveRelation?: (neighborId: string) => void
  relationActingId?: string | null
  onOpenRelations?: () => void
  neighborFeed?: PostBlockData[]
  myPosts?: PostBlockData[]
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void
  showInterest?: boolean
  getInterestState?: (postId: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string) => void
}

export default function YardBlock({
  background,
  ring,
  avatar,
  doorplate,
  loading = false,
  discoveries = [],
  onDiscoveryDismiss,
  recommended = [],
  onRecommendHouseClick,
  onApplyNeighbor,
  applyLoadingHouseId = null,
  relations = [],
  onAcceptRelation,
  onRemoveRelation,
  relationActingId = null,
  onOpenRelations,
  neighborFeed = [],
  myPosts = [],
  onPostClick,
  onCommentClick,
  showInterest = false,
  getInterestState,
  interestLoadingId = null,
  onInterestClick,
}: YardBlockProps) {
  if (loading) return <div style={styles.loading}>🌳</div>

  const received = relations.filter((r) => r.status === 'pending' && r.direction === 'incoming')
  const sent = relations.filter((r) => r.status === 'pending' && r.direction === 'outgoing')
  const accepted = relations.filter((r) => r.status === 'accepted')

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
                <button style={styles.discoveryDismiss} onClick={() => onDiscoveryDismiss?.(d.id)}>✕</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <NeighborContentBlock
        tier="public"
        mode="recommend"
        neighbors={recommended}
        onNeighborClick={(id) => onRecommendHouseClick?.(id)}
        onPostClick={onPostClick}
        onApplyNeighbor={onApplyNeighbor}
        applyLoadingHouseId={applyLoadingHouseId}
      />

      <section style={styles.relationSection}>
        <div style={styles.relationHeader}>
          <span style={styles.relationTitle}>이웃 관계</span>
          {onOpenRelations && (
            <button type="button" style={styles.relationMore} onClick={onOpenRelations}>전체 ›</button>
          )}
        </div>
        {relations.length === 0 ? (
          <div style={styles.relationEmpty}>신청·이웃이 여기 모입니다</div>
        ) : (
          <div style={styles.relationList}>
            {received.map((r) => (
              <div key={r.id} style={styles.relationRow}>
                <span style={styles.relationName}>{r.title}</span>
                <span style={styles.badgeIn}>받은 요청</span>
                <button type="button" style={styles.relAccept} disabled={relationActingId === r.id} onClick={() => onAcceptRelation?.(r.id)}>수락</button>
                <button type="button" style={styles.relGhost} disabled={relationActingId === r.id} onClick={() => onRemoveRelation?.(r.id)}>거절</button>
              </div>
            ))}
            {sent.map((r) => (
              <div key={r.id} style={styles.relationRow}>
                <span style={styles.relationName}>{r.title}</span>
                <span style={styles.badgeOut}>신청중</span>
                <button type="button" style={styles.relGhost} disabled={relationActingId === r.id} onClick={() => onRemoveRelation?.(r.id)}>취소</button>
              </div>
            ))}
            {accepted.map((r) => (
              <div key={r.id} style={styles.relationRow}>
                <span style={styles.relationName}>{r.title}</span>
                <span style={styles.badgeOk}>이웃</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <MyContentBlock
        title="이웃 공개 방 최신"
        posts={neighborFeed}
        onPostClick={(id) => onPostClick?.(id)}
        onCommentClick={onCommentClick}
        showInterest={showInterest}
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={onInterestClick}
      />

      <MyContentBlock
        title="내 방 최신 콘텐츠"
        posts={myPosts}
        onPostClick={(id) => onPostClick?.(id)}
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
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  discoverySection: { padding: '0 16px 4px' },
  discoveryTitle: { fontSize: 13, fontWeight: 600, color: '#2C1810', marginBottom: 8 },
  discoveryList: { display: 'flex', flexDirection: 'column', gap: 8 },
  discoveryCard: {
    background: 'linear-gradient(135deg, rgba(193,127,60,0.08), rgba(74,82,64,0.06))',
    border: '1px solid rgba(193,127,60,0.2)',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discoveryText: { fontSize: 13, color: '#2C1810', lineHeight: 1.5, flex: 1 },
  discoveryDismiss: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9A8470', padding: '0 0 0 8px', flexShrink: 0 },
  relationSection: { padding: '16px', borderTop: '1px solid rgba(92,61,46,0.08)' },
  relationHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  relationTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 15, fontWeight: 600, color: '#2C1810' },
  relationMore: { border: 'none', background: 'none', color: '#9A8470', fontSize: 12, cursor: 'pointer' },
  relationEmpty: {
    fontSize: 13, color: '#9A8470', padding: '16px', textAlign: 'center',
    background: '#FEFCF8', borderRadius: 12, border: '1px dashed rgba(92,61,46,0.12)',
  },
  relationList: { display: 'flex', flexDirection: 'column', gap: 8 },
  relationRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
    background: '#FEFCF8', borderRadius: 12, border: '1px solid rgba(92,61,46,0.08)',
  },
  relationName: { flex: 1, fontSize: 13, color: '#2C1810', fontWeight: 500 },
  badgeIn: { fontSize: 10, color: '#C17F3C', background: '#FFF7E8', padding: '2px 8px', borderRadius: 999 },
  badgeOut: { fontSize: 10, color: '#9A8470', background: '#F5F0E8', padding: '2px 8px', borderRadius: 999 },
  badgeOk: { fontSize: 10, color: '#4A5240', background: 'rgba(74,82,64,0.12)', padding: '2px 8px', borderRadius: 999 },
  relAccept: { border: 'none', background: '#2C1810', color: '#fff', fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' },
  relGhost: { border: '1px solid rgba(92,61,46,0.12)', background: '#fff', color: '#5C4A35', fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' },
}
