'use client'

import { useState } from 'react'
import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

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
  visitorMode?: boolean
  discoveries?: DiscoveryItem[]
  onDiscoveryDismiss?: (id: string) => void
  recommended?: NeighborChip[]
  onRecommendHouseClick?: (houseId: string) => void
  onAcceptedNeighborClick?: (houseId: string) => void
  onApplyNeighbor?: (houseId: string) => void
  applyLoadingHouseId?: string | null
  relations?: YardRelationRow[]
  onAcceptRelation?: (neighborId: string) => void
  onRemoveRelation?: (neighborId: string) => void
  relationActingId?: string | null
  onOpenRelations?: () => void
  neighborFeed?: PostBlockData[]
  myPosts?: PostBlockData[]
  publicPosts?: PostBlockData[]
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void
  showInterest?: boolean
  getInterestState?: (postId: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string) => void
  enableInlineComment?: boolean
  ownerKey?: string
  onInterestGoLibrary?: () => void
}

export default function YardBlock({
  background,
  ring,
  avatar,
  doorplate,
  loading = false,
  visitorMode = false,
  discoveries = [],
  onDiscoveryDismiss,
  recommended = [],
  onRecommendHouseClick,
  onAcceptedNeighborClick,
  onApplyNeighbor,
  applyLoadingHouseId = null,
  relations = [],
  onAcceptRelation,
  onRemoveRelation,
  relationActingId = null,
  onOpenRelations,
  neighborFeed = [],
  myPosts = [],
  publicPosts = [],
  onPostClick,
  onCommentClick,
  showInterest = false,
  getInterestState,
  interestLoadingId = null,
  onInterestClick,
  enableInlineComment = false,
  ownerKey,
  onInterestGoLibrary,
}: YardBlockProps) {
  if (loading) return <div style={styles.loading}>🌳</div>

  const received = relations.filter((r) => r.status === 'pending' && r.direction === 'incoming')
  const sent = relations.filter((r) => r.status === 'pending' && r.direction === 'outgoing')
  const accepted = relations.filter((r) => r.status === 'accepted')
  const [relTab, setRelTab] = useState<'accepted' | 'sent' | 'received'>('accepted')
  const relList =
    relTab === 'accepted' ? accepted : relTab === 'sent' ? sent : received
  const relShow = relList.slice(0, 5)

  const canManageRelations = !visitorMode && !!(onAcceptRelation || onRemoveRelation)

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
        mode={visitorMode ? 'neighbor' : 'recommend'}
        neighbors={recommended}
        onNeighborClick={(id) => onRecommendHouseClick?.(id)}
        onPostClick={onPostClick}
        onApplyNeighbor={visitorMode ? undefined : onApplyNeighbor}
        applyLoadingHouseId={applyLoadingHouseId}
      />

      <section style={styles.relationSection}>
        <div style={styles.relationHeader}>
          <span style={styles.relationTitle}>이웃 관계</span>
          {onOpenRelations && !visitorMode && (
            <button type="button" style={styles.relationMore} onClick={onOpenRelations}>전체 ›</button>
          )}
        </div>
        <div style={styles.relTabs}>
          {(
            [
              ['accepted', '이웃', accepted.length],
              ['sent', '신청', sent.length],
              ['received', '요청', received.length],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              style={{
                ...styles.relTab,
                ...(relTab === key ? styles.relTabOn : null),
              }}
              onClick={() => setRelTab(key)}
            >
              {label}
              {n > 0 ? ` ${n}` : ''}
            </button>
          ))}
        </div>
        {relShow.length === 0 ? (
          <div style={styles.relationEmpty}>
            {visitorMode ? '이 집의 이웃이 여기 모입니다' : '신청·이웃이 여기 모입니다'}
          </div>
        ) : (
          <div style={styles.relationList}>
            {relShow.map((r) => (
              <div key={r.id} style={styles.relationRow}>
                <span style={styles.relationName}>{r.title}</span>
                {canManageRelations && relTab === 'received' && (
                  <>
                    <button type="button" style={styles.relAccept} disabled={relationActingId === r.id} onClick={() => onAcceptRelation?.(r.id)}>수락</button>
                    <button type="button" style={styles.relGhost} disabled={relationActingId === r.id} onClick={() => onRemoveRelation?.(r.id)}>거절</button>
                  </>
                )}
                {canManageRelations && relTab === 'sent' && (
                  <button type="button" style={styles.relGhost} disabled={relationActingId === r.id} onClick={() => onRemoveRelation?.(r.id)}>취소</button>
                )}
                {relTab === 'accepted' && (
                  <>
                    <span style={styles.badgeOk}>이웃</span>
                    {r.houseId && onRecommendHouseClick && (
                      <button
                        type="button"
                        style={styles.relAccept}
                        onClick={() => onRecommendHouseClick(r.houseId!)}
                      >
                        마당
                      </button>
                    )}
                    {!visitorMode && r.houseId && onAcceptedNeighborClick && (
                      <button
                        type="button"
                        style={styles.relGhost}
                        onClick={() => onAcceptedNeighborClick(r.houseId!)}
                      >
                        거실
                      </button>
                    )}
                  </>
                )}
                {visitorMode && relTab !== 'accepted' && (
                  <span style={styles.badgeOut}>{relTab === 'sent' ? '신청' : '요청'}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {visitorMode ? (
        <MyContentBlock
          title="공개 방 최신"
          posts={publicPosts}
          onPostClick={onPostClick}
          onCommentClick={onCommentClick}
          showInterest={showInterest}
          getInterestState={getInterestState}
          interestLoadingId={interestLoadingId}
          onInterestClick={onInterestClick}
          enableInlineComment={enableInlineComment}
          ownerKey={ownerKey}
          onInterestGoLibrary={onInterestGoLibrary}
        />
      ) : (
        <>
          <MyContentBlock
            title="이웃 공개 방 최신"
            posts={neighborFeed}
            onPostClick={onPostClick}
            onCommentClick={onCommentClick}
            showInterest={showInterest}
            getInterestState={getInterestState}
            interestLoadingId={interestLoadingId}
            onInterestClick={onInterestClick}
            enableInlineComment={enableInlineComment}
            ownerKey={ownerKey}
            onInterestGoLibrary={onInterestGoLibrary}
          />
          <MyContentBlock
            title="내 방 최신 콘텐츠"
            posts={myPosts}
            onPostClick={onPostClick}
            onCommentClick={onCommentClick}
            showInterest={showInterest}
            getInterestState={getInterestState}
            interestLoadingId={interestLoadingId}
            onInterestClick={onInterestClick}
            enableInlineComment={enableInlineComment}
            ownerKey={ownerKey}
            onInterestGoLibrary={onInterestGoLibrary}
          />
        </>
      )}
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
  relTabs: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 },
  relTab: {
    border: '1px solid rgba(92,61,46,0.12)',
    background: '#FEFCF8',
    color: '#5C4A35',
    fontSize: 12,
    padding: '8px 0',
    borderRadius: 10,
    cursor: 'pointer',
  },
  relTabOn: {
    background: '#2C1810',
    color: '#FEFCF8',
    borderColor: '#2C1810',
  },
  // 모바일 우선: 1열 나열 (2열 그리드는 좁은 화면에서 깨짐)
  relationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  relationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: '#FEFCF8',
    borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.08)',
    minWidth: 0,
  },
  relationName: {
    flex: 1,
    fontSize: 13,
    color: '#2C1810',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  badgeOut: { fontSize: 10, color: '#9A8470', background: '#F5F0E8', padding: '2px 8px', borderRadius: 999, flexShrink: 0 },
  badgeOk: { fontSize: 10, color: '#4A5240', background: 'rgba(74,82,64,0.12)', padding: '2px 8px', borderRadius: 999, flexShrink: 0 },
  relAccept: { border: 'none', background: '#2C1810', color: '#fff', fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 },
  relGhost: { border: '1px solid rgba(92,61,46,0.12)', background: '#fff', color: '#5C4A35', fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 },
}
