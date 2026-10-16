'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import NeighborContentBlock, { NeighborChip } from './NeighborContentBlock'
import { PostBlockData } from './PostBlock'
import { RingData } from './RingBlock'

export interface YardRelationRow {
  id: string
  houseId: string
  title: string
  status: 'accepted' | 'pending'
  direction?: 'incoming' | 'outgoing'
  avatarUrl?: string | null
  langFlag?: string
}

export interface YardBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate
  heroControls?: React.ReactNode
  avatarControls?: React.ReactNode
  doorplateHandles?: React.ReactNode
  loading?: boolean
  visitorMode?: boolean
  discoveries?: any[]
  onDiscoveryDismiss?: (id: string) => void
  recommended?: NeighborChip[]
  onRecommendHouseClick?: (houseId: string) => void
  onAcceptedNeighborClick?: (houseId: string) => void
  onApplyNeighbor?: (houseId: string) => void
  applyLoadingHouseId?: string | null
  relations?: YardRelationRow[]
  onOpenRelations?: () => void
  onAcceptRelation?: (id: string) => void
  onRemoveRelation?: (id: string) => void
  relationActingId?: string | null
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

function NeighborAvatar({ row }: { row: YardRelationRow }) {
  if (row.avatarUrl) {
    return <img src={row.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
  }
  return <span style={{ fontSize: 18 }}>{row.langFlag || '🏡'}</span>
}

export default function YardBlock({
  background,
  ring,
  avatar,
  doorplate,
  heroControls,
  avatarControls,
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
  onAcceptRelation,
  onRemoveRelation,
  relationActingId = null,
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
  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 }}>🌳</div>
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
        doorplateHandles={doorplateHandles}
      />

      {!visitorMode && recommended.length > 0 && (
        <NeighborContentBlock
          tier="recommend"
          neighbors={recommended}
          onNeighborClick={(id) => onRecommendHouseClick?.(id)}
          onAcceptedNeighborClick={onAcceptedNeighborClick}
          onApplyNeighbor={onApplyNeighbor}
          applyLoadingHouseId={applyLoadingHouseId}
          onPostClick={onPostClick}
        />
      )}

      {!visitorMode && relations.length > 0 && (
        <section style={{ padding: '16px 16px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#5C4A35' }}>관계</div>
            {onOpenRelations && (
              <button type="button" onClick={onOpenRelations} style={{ border: 0, background: 'none', color: '#9A8470', fontSize: 12, cursor: 'pointer' }}>
                관리
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {relations.map((row) => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#FEFCF8', borderRadius: 12, border: '1px solid rgba(92,61,46,0.1)' }}>
                <NeighborAvatar row={row} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#1C1208', fontWeight: 500 }}>{row.title}</div>
                  <div style={{ fontSize: 11, color: '#9A8470' }}>
                    {row.status === 'accepted' ? '이웃' : row.direction === 'incoming' ? '받은 신청' : '보낸 신청'}
                  </div>
                </div>
                {row.status === 'pending' && row.direction === 'incoming' && onAcceptRelation && (
                  <button type="button" disabled={relationActingId === row.id} onClick={() => onAcceptRelation(row.id)} style={{ border: 0, background: '#4A7C3F', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                    수락
                  </button>
                )}
                {onRemoveRelation && (
                  <button type="button" disabled={relationActingId === row.id} onClick={() => onRemoveRelation(row.id)} style={{ border: '1px solid rgba(92,61,46,0.15)', background: 'none', color: '#9A8470', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                    {row.status === 'accepted' ? '해제' : '취소'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <MyContentBlock
        title="이웃공개방 최신"
        layout="brick"
        posts={neighborFeed}
        onPostClick={onPostClick}
        onCommentClick={onCommentClick}
        showInterest={showInterest}
        getInterestState={getInterestState}
        interestLoadingId={interestLoadingId}
        onInterestClick={onInterestClick}
        onInterestGoLibrary={onInterestGoLibrary}
        enableInlineComment={enableInlineComment}
        ownerKey={ownerKey}
        emptyLabel="이웃 공개방이 아직 없어요"
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
        onInterestGoLibrary={onInterestGoLibrary}
        enableInlineComment={enableInlineComment}
        ownerKey={ownerKey}
        emptyLabel="아직 이야기가 없어요"
      />
    </div>
  )
}
