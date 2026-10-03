'use client'

import { useEffect, useState } from 'react'
import PostBlock, { PostBlockData } from '@/components/blocks/PostBlock'
import RingBlock, { RingData } from './RingBlock'

export interface NeighborRoomSlot {
  roomId: string
  roomName: string
  latestPost?: PostBlockData | null
}

export interface NeighborChip {
  neighborId: string
  houseId: string
  title: string
  langFlag?: string
  avatarUrl?: string | null
  coverUrl?: string | null
  rooms?: NeighborRoomSlot[]
  requestPending?: boolean
  ring?: RingData | null
}

export interface NeighborContentBlockProps {
  tier: 'public' | 'invite'
  mode?: 'recommend' | 'neighbor'
  neighbors: NeighborChip[]
  onNeighborClick: (houseId: string) => void
  showNeighborSelector?: boolean
  onPostClick?: (postId: string, roomId?: string) => void
  onApplyNeighbor?: (houseId: string) => void
  applyLoadingHouseId?: string | null
  /** 골목=2(기본) · 거실 복도=1 */
  roomsPerPage?: 1 | 2
  emptyLabel?: string
}

const TIER_LABEL: Record<string, string> = { public: '골목', invite: '복도' }
const COVER_GRADIENT: Record<string, string> = {
  public: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
  invite: 'linear-gradient(135deg, #5C4A35 0%, #8A6F52 60%, #D8C4A8 100%)',
}

const DEFAULT_RING: RingData = {
  rings: [
    { index: 0, weight: 0.6 },
    { index: 1, weight: 0.4 },
    { index: 2, weight: 0.25 },
  ],
}

const ALLEY_FRAME_HEIGHT = 260

export default function NeighborContentBlock({
  tier,
  mode = 'neighbor',
  neighbors,
  onNeighborClick,
  showNeighborSelector = false,
  onPostClick,
  onApplyNeighbor,
  applyLoadingHouseId = null,
  roomsPerPage = 2,
  emptyLabel,
}: NeighborContentBlockProps) {
  const [neighborIdx, setNeighborIdx] = useState(0)
  const [roomIdx, setRoomIdx] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    if (neighborIdx >= neighbors.length) setNeighborIdx(Math.max(0, neighbors.length - 1))
  }, [neighbors.length, neighborIdx])

  const current = neighbors[neighborIdx] || null
  const rooms = current?.rooms || []
  const step = roomsPerPage === 1 ? 1 : 2

  useEffect(() => {
    setRoomIdx(0)
  }, [neighborIdx, current?.neighborId, current?.houseId])

  useEffect(() => {
    if (roomIdx >= rooms.length) setRoomIdx(Math.max(0, rooms.length - 1))
  }, [rooms.length, roomIdx])

  const roomPageCount = Math.max(1, Math.ceil(rooms.length / step) || 1)
  const roomPage = Math.min(Math.floor(roomIdx / step), roomPageCount - 1)
  const postA = rooms[roomPage * step]?.latestPost || null
  const postB = step === 2 ? rooms[roomPage * step + 1]?.latestPost || null : null
  const roomA = rooms[roomPage * step]
  const roomB = step === 2 ? rooms[roomPage * step + 1] : undefined

  // 집이 하나뿐이면 화살표·스와이프로 방 이동 (거실 복도)
  const navigateRooms = neighbors.length <= 1 && rooms.length > step

  const goNeighbor = (dir: -1 | 1) => {
    if (neighbors.length <= 1) return
    setNeighborIdx((i) => (i + dir + neighbors.length) % neighbors.length)
  }

  const goRoom = (dir: -1 | 1) => {
    if (rooms.length <= step) return
    setRoomIdx((i) => {
      const page = Math.floor(i / step)
      const next = (page + dir + roomPageCount) % roomPageCount
      return next * step
    })
  }

  const go = (dir: -1 | 1) => {
    if (navigateRooms) goRoom(dir)
    else goNeighbor(dir)
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return
    const delta = (event.changedTouches[0]?.clientX || touchStartX) - touchStartX
    setTouchStartX(null)
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1)
  }

  const title =
    mode === 'recommend'
      ? tier === 'public'
        ? '골목 · 발견'
        : '복도 · 발견'
      : TIER_LABEL[tier] || '이웃'

  const emptyText =
    emptyLabel ||
    (mode === 'recommend'
      ? '아직 발견할 집이 없어요'
      : tier === 'invite'
        ? '아직 방이 없어요'
        : '이 집의 이웃이 아직 없어요')

  const showArrows = navigateRooms || neighbors.length > 1
  const countLabel = navigateRooms
    ? `${roomPage + 1}/${roomPageCount}`
    : neighbors.length > 0
      ? `${neighborIdx + 1}/${neighbors.length}`
      : null

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {countLabel && <span style={styles.count}>{countLabel}</span>}
      </div>

      {neighbors.length === 0 || (navigateRooms && rooms.length === 0 && neighbors.length > 0) ? (
        <div style={styles.empty}>{emptyText}</div>
      ) : neighbors.length === 0 ? (
        <div style={styles.empty}>{emptyText}</div>
      ) : (
        <div style={styles.stage}>
          {showArrows && (
            <>
              <button type="button" style={{ ...styles.edgeArrow, left: 0 }} onClick={() => go(-1)} aria-label="이전">‹</button>
              <button type="button" style={{ ...styles.edgeArrow, right: 0 }} onClick={() => go(1)} aria-label="다음">›</button>
            </>
          )}

          <div
            className="cn-alley-row"
            data-posts={Number(!!postA) + Number(!!postB)}
            onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
            onTouchEnd={handleTouchEnd}
          >
            <div style={styles.col1}>
              <div
                style={{
                  ...styles.cover,
                  background: current?.coverUrl
                    ? `center/cover no-repeat url(${current.coverUrl})`
                    : COVER_GRADIENT[tier],
                }}
                onClick={() => current && onNeighborClick(current.houseId)}
              >
                <div style={styles.coverShade} />
                <div style={styles.profileCenter}>
                  <RingBlock
                    data={current?.ring || DEFAULT_RING}
                    size={100}
                    centerContent={
                      current?.avatarUrl ? (
                        <img src={current.avatarUrl} alt="" style={styles.avatarImg} />
                      ) : (
                        <span style={{ fontSize: 22 }}>{current?.langFlag || '🏡'}</span>
                      )
                    }
                  />
                  <div style={styles.profileName}>{current?.title}</div>
                </div>

                {mode === 'recommend' && onApplyNeighbor && current && (
                  <button
                    type="button"
                    style={{
                      ...styles.applyBtnInCover,
                      opacity: current.requestPending || applyLoadingHouseId === current.houseId ? 0.55 : 1,
                    }}
                    disabled={!!current.requestPending || applyLoadingHouseId === current.houseId}
                    onClick={(e) => {
                      e.stopPropagation()
                      onApplyNeighbor(current.houseId)
                    }}
                  >
                    {current.requestPending
                      ? '신청중'
                      : applyLoadingHouseId === current.houseId
                        ? '…'
                        : '신청'}
                  </button>
                )}
              </div>
            </div>

            {postA && (
              <div style={styles.colPost}>
                {roomA && <div style={styles.roomTag}>{roomA.roomName}</div>}
                <div style={styles.postFrame}>
                  <PostBlock
                    post={postA}
                    variant="gallery"
                    showViewMeta={false}
                    showComments={false}
                    onClick={() => onPostClick?.(postA.id, roomA?.roomId)}
                  />
                </div>
              </div>
            )}

            {postB && (
              <div style={styles.colPost}>
                {roomB && <div style={styles.roomTag}>{roomB.roomName}</div>}
                <div style={styles.postFrame}>
                  <PostBlock
                    post={postB}
                    variant="gallery"
                    showViewMeta={false}
                    showComments={false}
                    onClick={() => onPostClick?.(postB.id, roomB?.roomId)}
                  />
                </div>
              </div>
            )}
          </div>

          {roomPageCount > 1 && (
            <div className="cn-alley-dots">
              <div className="cn-alley-dots-inner" style={styles.dots}>
                {Array.from({ length: roomPageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    style={{ ...styles.dot, background: i === roomPage ? '#2C1810' : 'rgba(92,61,46,0.2)' }}
                    onClick={() => setRoomIdx(i * step)}
                    aria-label={`방 페이지 ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {showNeighborSelector && neighbors.length > 1 && (
            <div style={styles.neighborSelector} aria-label="골목 이웃 선택">
              {neighbors.map((neighbor, index) => (
                <button
                  key={neighbor.neighborId}
                  type="button"
                  aria-label={neighbor.title}
                  aria-pressed={index === neighborIdx}
                  style={styles.selectorItem}
                  onClick={() => setNeighborIdx(index)}
                >
                  <span
                    style={{
                      ...styles.selectorAvatar,
                      ...(index === neighborIdx ? styles.selectorAvatarActive : {}),
                    }}
                  >
                    {neighbor.avatarUrl ? (
                      <img src={neighbor.avatarUrl} alt="" style={styles.selectorImage} />
                    ) : (
                      neighbor.langFlag || '🏡'
                    )}
                  </span>
                  <span style={{ ...styles.selectorName, ...(index === neighborIdx ? styles.selectorNameActive : {}) }}>
                    {neighbor.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '18px 16px 16px',
    borderTop: '1px solid rgba(92,61,46,0.08)',
    background: 'rgba(255,255,255,0.34)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: "'Noto Serif KR', serif", fontSize: 15, fontWeight: 600, color: '#2C1810' },
  count: {
    fontSize: 11, color: '#C17F3C', background: '#FFF7E8',
    border: '1px solid rgba(193,127,60,0.16)', borderRadius: 999, padding: '3px 8px',
  },
  empty: {
    textAlign: 'center', padding: '24px 16px', fontSize: 13, color: '#9A8470',
    background: '#FEFCF8', borderRadius: 14, border: '1px dashed rgba(92,61,46,0.15)',
  },
  stage: { position: 'relative' },
  edgeArrow: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
    width: 28, height: 36, borderRadius: 10, border: '1px solid rgba(92,61,46,0.12)',
    background: 'rgba(254,252,248,0.95)', color: '#2C1810', fontSize: 20, lineHeight: '36px',
    padding: 0, cursor: 'pointer', boxShadow: '0 2px 8px rgba(44,24,16,0.08)',
  },
  col1: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: ALLEY_FRAME_HEIGHT,
  },
  cover: {
    position: 'relative',
    flex: 1,
    height: '100%',
    minHeight: ALLEY_FRAME_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  coverShade: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.42) 100%)',
    pointerEvents: 'none',
  },
  profileCenter: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 1, padding: '8px 8px 40px',
  },
  avatarImg: { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' },
  profileName: {
    fontSize: 12, fontWeight: 600, color: '#FEFCF8', textAlign: 'center',
    textShadow: '0 1px 3px rgba(0,0,0,0.45)', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', maxWidth: '100%',
  },
  applyBtnInCover: {
    position: 'absolute',
    left: '50%',
    bottom: 12,
    transform: 'translateX(-50%)',
    zIndex: 2,
    padding: '5px 16px',
    borderRadius: 999,
    border: '1px solid rgba(254,252,248,0.35)',
    background: 'rgba(28,18,8,0.72)',
    color: '#FEFCF8',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
  },
  colPost: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    height: ALLEY_FRAME_HEIGHT,
  },
  roomTag: {
    fontSize: 10, color: '#9A8470', paddingLeft: 2, overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
  },
  postFrame: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  dots: { display: 'flex', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer' },
  neighborSelector: {
    display: 'flex', gap: 14, overflowX: 'auto', padding: '14px 4px 2px',
    WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
  },
  selectorItem: {
    flex: '0 0 58px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    border: 0, background: 'none', padding: 0, cursor: 'pointer',
  },
  selectorAvatar: {
    width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', background: 'linear-gradient(135deg, #4A5240, #C17F3C)',
    border: '2px solid transparent', transition: 'transform 160ms ease, border-color 160ms ease',
  },
  selectorAvatarActive: { borderColor: '#2C1810', transform: 'scale(1.1)' },
  selectorImage: { width: '100%', height: '100%', objectFit: 'cover' },
  selectorName: { maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, color: '#9A8470' },
  selectorNameActive: { color: '#2C1810', fontWeight: 600 },
}
