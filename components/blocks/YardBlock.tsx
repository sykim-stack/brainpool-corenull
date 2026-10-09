'use client'

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
  heroControls?: React.ReactNode
  doorplateHandles?: React.ReactNode
  loading?: boolean
  visitorMode?: boolean
  discoveries?: DiscoveryItem[]
  onDiscoveryDismiss?: (id: string) => void
  /** 골목 = 발견 (모르는 집). 연결된 이웃과 합치지 않음 */
  recommended?: NeighborChip[]
  onRecommendHouseClick?: (houseId: string) => void
  onAcceptedNeighborClick?: (houseId: string) => void
  onApplyNeighbor?: (houseId: string) => void
  applyLoadingHouseId?: string | null
  /** 연결된 이웃 목록용. 화면에는 accepted만 노출. 수락/거절은 /me */
  relations?: YardRelationRow[]
  /** @deprecated 마당 화면에서 관리 금지. /me/neighbors 로 이동 */
  onAcceptRelation?: (neighborId: string) => void
  /** @deprecated 마당 화면에서 관리 금지. /me/neighbors 로 이동 */
  onRemoveRelation?: (neighborId: string) => void
  relationActingId?: string | null
  onOpenRelations?: () => void
  neighborFeed?: PostBlockData[]
  myPosts?: PostBlockData[]
  publicPosts?: PostBlockData[]
  onPostClick?: (postId: string, roomId?: string) => void
  onCommentClick?: (postId: string) => void
  showInterest?: boolean
  getInterestState?: (postId: string, roomId?: string) => 'none' | 'active' | 'ended'
  interestLoadingId?: string | null
  onInterestClick?: (postId: string, roomId?: string) => void
  enableInlineComment?: boolean
  ownerKey?: string
  onInterestGoLibrary?: () => void
}

function NeighborAvatar({
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
  heroControls,
  doorplateHandles,
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

  // 화면: 연결된 이웃만. pending 수락/거절은 관리(/me) — 마당에 두지 않음.
  const connected = relations.filter((r) => r.status === 'accepted')
  const alleyMode = visitorMode ? 'neighbor' : 'recommend'

  return (
    <div>
      <HeroBlock
        background={background}
        ring={ring}
        avatar={avatar}
        doorplate={doorplate}
        heroControls={heroControls}
        doorplateHandles={!visitorMode ? doorplateHandles : undefined}
      />

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

      {/* 골목 = 발견. 연결된 이웃망과 합치지 않음 */}
      <NeighborContentBlock
        tier="public"
        mode={alleyMode}
        neighbors={recommended}
        showNeighborSelector
        onNeighborClick={(id) => onRecommendHouseClick?.(id)}
        onPostClick={onPostClick}
        onApplyNeighbor={visitorMode ? undefined : onApplyNeighbor}
        applyLoadingHouseId={visitorMode ? null : applyLoadingHouseId}
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

      {/* 하단 = 이미 연결된 이웃 (방문). 관리 버튼 없음 */}
      <section style={styles.relationSection}>
        <div style={styles.relationHeader}>
          <span style={styles.relationTitle}>이웃</span>
          {onOpenRelations && !visitorMode && (
            <button type="button" style={styles.relationMore} onClick={onOpenRelations}>
              관리 ›
            </button>
          )}
        </div>

        {connected.length === 0 ? (
          <div style={styles.relationEmpty}>
            {visitorMode ? '이 집의 이웃이 여기 모입니다' : '연결된 이웃이 생기면 여기에 보여요'}
          </div>
        ) : (
          <div style={styles.relAvatarRow}>
            {connected.map((r) => (
              <NeighborAvatar
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
      </section>

      {visitorMode ? (
        <MyContentBlock
          title="공개 방 최신"
          layout="brick"
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
            layout="brick"
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
            title="내 방 최신"
            layout="density"
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
}
