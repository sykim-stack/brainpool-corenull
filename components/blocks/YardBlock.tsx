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
  avatarUrl?: string | null
  langFlag?: string
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

function RelationAvatar({
  row,
  onClick,
}: {
  row: YardRelationRow
  onClick?: () => void
}) {
  const initial = (row.title || '?').trim().charAt(0)
  return (
    <button
      type="button"
      onClick={onClick}
      title={row.title}
      aria-label={row.title}
      style={styles.relAvatarBtn}
    >
      <div style={styles.relAvatarCircle}>
        {row.avatarUrl ? (
          <img src={row.avatarUrl} alt="" style={styles.relAvatarImg} />
        ) : (
          <span style={styles.relAvatarInitial}>{row.langFlag || initial}</span>
        )}
      </div>
      <span style={styles.relAvatarName}>{row.title}</span>
    </button>
  )
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

      {/* 이웃 관계 — 히어로 프로필 아이콘 가로 나열 */}
      <section style={styles.relationSection}>
        <div style={styles.relationHeader}>
          <span style={styles.relationTitle}>이웃 관계</span>
          {onOpenRelations && !visitorMode && (
            <button type="button" style={styles.relationMore} onClick={onOpenRelations}>
              전체 ›
            </button>
          )}
        </div>

        {accepted.length === 0 && received.length === 0 && sent.length === 0 ? (
          <div style={styles.relationEmpty}>
            {visitorMode ? '이 집의 이웃이 여기 모입니다' : '이웃이 생기면 여기에 보여요'}
          </div>
        ) : (
          <>
            {accepted.length > 0 && (
              <div style={styles.relAvatarRow}>
                {accepted.map((r) => (
                  <RelationAvatar
                    key={r.id}
                    row={r}
                    onClick={() => {
                      if (!r.houseId) return
                      if (onAcceptedNeighborClick) onAcceptedNeighborClick(r.houseId)
                      else onRecommendHouseClick?.(r.houseId)
                    }}
                  />
                ))}
              </div>
            )}

            {/* 요청/신청 — 작은 칩 (관리용) */}
            {canManageRelations && (received.length > 0 || sent.length > 0) && (
              <div style={styles.pendingBlock}>
                {received.map((r) => (
                  <div key={r.id} style={styles.pendingRow}>
                    <span style={styles.pendingName}>{r.title}</span>
                    <span style={styles.pendingTag}>요청</span>
                    <button
                      type="button"
                      style={styles.relAccept}
                      disabled={relationActingId === r.id}
                      onClick={() => onAcceptRelation?.(r.id)}
                    >
                      수락
                    </button>
                    <button
                      type="button"
                      style={styles.relGhost}
                      disabled={relationActingId === r.id}
                      onClick={() => onRemoveRelation?.(r.id)}
                    >
                      거절
                    </button>
                  </div>
                ))}
                {sent.map((r) => (
                  <div key={r.id} style={styles.pendingRow}>
                    <span style={styles.pendingName}>{r.title}</span>
                    <span style={styles.pendingTag}>신청</span>
                    <button
                      type="button"
                      style={styles.relGhost}
                      disabled={relationActingId === r.id}
                      onClick={() => onRemoveRelation?.(r.id)}
                    >
                      취소
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
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
  discoveryDismiss: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9A8470',
    padding: '0 0 0 8px', flexShrink: 0,
  },
  relationSection: { padding: '16px', borderTop: '1px solid rgba(92,61,46,0.08)' },
  relationHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  relationTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 15, fontWeight: 600, color: '#2C1810',
  },
  relationMore: { border: 'none', background: 'none', color: '#9A8470', fontSize: 12, cursor: 'pointer' },
  relationEmpty: {
    fontSize: 13, color: '#9A8470', padding: '16px', textAlign: 'center',
    background: '#FEFCF8', borderRadius: 12, border: '1px dashed rgba(92,61,46,0.12)',
  },
  relAvatarRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 14,
    overflowX: 'auto',
    paddingBottom: 4,
    WebkitOverflowScrolling: 'touch',
  },
  relAvatarBtn: {
    flexShrink: 0,
    width: 64,
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  relAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4A5240, #C17F3C)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(44,24,16,0.12)',
  },
  relAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  relAvatarInitial: { fontSize: 18, color: '#FEFCF8', fontWeight: 600 },
  relAvatarName: {
    fontSize: 10,
    color: '#5C4A35',
    maxWidth: 64,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  pendingBlock: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 },
  pendingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: '#FEFCF8',
    borderRadius: 10,
    border: '1px solid rgba(92,61,46,0.08)',
  },
  pendingName: {
    flex: 1, fontSize: 12, color: '#2C1810', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
  },
  pendingTag: {
    fontSize: 10, color: '#9A8470', background: '#F5F0E8',
    padding: '2px 7px', borderRadius: 999, flexShrink: 0,
  },
  relAccept: {
    border: 'none', background: '#2C1810', color: '#fff', fontSize: 11,
    padding: '5px 9px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
  },
  relGhost: {
    border: '1px solid rgba(92,61,46,0.12)', background: '#fff', color: '#5C4A35',
    fontSize: 11, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
  },
}
