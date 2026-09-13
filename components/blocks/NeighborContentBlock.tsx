'use client'

import { useEffect, useState } from 'react'
import PostBlock, { PostBlockData } from '@/components/blocks/PostBlock'

// NeighborContentBlock — 골목/복도 공용 1|2|3
// mode=recommend: 시스템 발견 후보 + 이웃 신청
// mode=neighbor: 연결 이웃
// Poster 아님 — Room View(PostBlock)

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
}

export interface NeighborContentBlockProps {
  tier: 'public' | 'invite'
  mode?: 'recommend' | 'neighbor'
  neighbors: NeighborChip[]
  onNeighborClick: (houseId: string) => void
  onPostClick?: (postId: string, roomId?: string) => void
  onApplyNeighbor?: (houseId: string) => void
  applyLoadingHouseId?: string | null
}

const TIER_LABEL: Record<string, string> = { public: '골목', invite: '복도' }
const COVER_GRADIENT: Record<string, string> = {
  public: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
  invite: 'linear-gradient(135deg, #5C4A35 0%, #8A6F52 60%, #D8C4A8 100%)',
}

export default function NeighborContentBlock({
  tier,
  mode = 'neighbor',
  neighbors,
  onNeighborClick,
  onPostClick,
  onApplyNeighbor,
  applyLoadingHouseId = null,
}: NeighborContentBlockProps) {
  const [neighborIdx, setNeighborIdx] = useState(0)
  const [roomIdx, setRoomIdx] = useState(0)

  useEffect(() => {
    if (neighborIdx >= neighbors.length) setNeighborIdx(Math.max(0, neighbors.length - 1))
  }, [neighbors.length, neighborIdx])

  const current = neighbors[neighborIdx] || null
  const rooms = current?.rooms || []

  useEffect(() => {
    setRoomIdx(0)
  }, [neighborIdx, current?.neighborId, current?.houseId])

  useEffect(() => {
    if (roomIdx >= rooms.length) setRoomIdx(Math.max(0, rooms.length - 1))
  }, [rooms.length, roomIdx])

  const postA = rooms[roomIdx]?.latestPost || null
  const postB = rooms[roomIdx + 1]?.latestPost || null
  const roomA = rooms[roomIdx]
  const roomB = rooms[roomIdx + 1]

  const goNeighbor = (dir: -1 | 1) => {
    if (neighbors.length === 0) return
    setNeighborIdx((i) => (i + dir + neighbors.length) % neighbors.length)
  }

  const title =
    mode === 'recommend'
      ? tier === 'public'
        ? '골목 · 발견'
        : '복도 · 발견'
      : TIER_LABEL[tier]

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {neighbors.length > 0 && <span style={styles.count}>{neighbors.length}</span>}
      </div>

      {neighbors.length === 0 ? (
        <div style={styles.empty}>
          {mode === 'recommend' ? '아직 발견할 집이 없어요' : '아직 이웃이 없어요'}
        </div>
      ) : (
        <>
          <div style={styles.row}>
            <div style={styles.col1}>
              <div
                style={{
                  ...styles.cover,
                  backgroundImage: current?.coverUrl
                    ? `url(${current.coverUrl})`
                    : COVER_GRADIENT[tier],
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onClick={() => current && onNeighborClick(current.houseId)}
                role="button"
              >
                <div style={styles.coverShade} />
                <div style={styles.profileWrap}>
                  <div style={styles.avatar}>
                    {current?.avatarUrl ? (
                      <img src={current.avatarUrl} alt="" style={styles.avatarImg} />
                    ) : (
                      <span style={{ fontSize: 22 }}>{current?.langFlag || '🏡'}</span>
                    )}
                  </div>
                  <div style={styles.profileName}>{current?.title}</div>
                </div>
              </div>

              {mode === 'recommend' && current && (
                <button
                  type="button"
                  style={{
                    ...styles.applyBtn,
                    opacity: current.requestPending || applyLoadingHouseId === current.houseId ? 0.55 : 1,
                  }}
                  disabled={!!current.requestPending || applyLoadingHouseId === current.houseId}
                  onClick={() => onApplyNeighbor?.(current.houseId)}
                >
                  {current.requestPending
                    ? '신청중'
                    : applyLoadingHouseId === current.houseId
                      ? '…'
                      : '이웃 신청'}
                </button>
              )}

              <div style={styles.arrows}>
                <button type="button" style={styles.arrowBtn} onClick={() => goNeighbor(-1)}>
                  ←
                </button>
                <span style={styles.arrowHint}>
                  {neighborIdx + 1}/{neighbors.length}
                </span>
                <button type="button" style={styles.arrowBtn} onClick={() => goNeighbor(1)}>
                  →
                </button>
              </div>
            </div>

            <div style={styles.colPost}>
              {roomA && <div style={styles.roomTag}>{roomA.roomName}</div>}
              {postA ? (
                <PostBlock
                  post={postA}
                  showViewMeta={false}
                  showComments={false}
                  onClick={() => onPostClick?.(postA.id, roomA?.roomId)}
                />
              ) : (
                <div style={styles.postEmpty}>{rooms.length === 0 ? '공개 방 없음' : '글 없음'}</div>
              )}
            </div>

            <div style={styles.colPost}>
              {roomB && <div style={styles.roomTag}>{roomB.roomName}</div>}
              {postB ? (
                <PostBlock
                  post={postB}
                  showViewMeta={false}
                  showComments={false}
                  onClick={() => onPostClick?.(postB.id, roomB?.roomId)}
                />
              ) : (
                <div style={styles.postEmpty}>{rooms.length <= 1 ? '—' : '글 없음'}</div>
              )}
            </div>
          </div>

          {rooms.length > 0 && (
            <div style={styles.dots}>
              {rooms.map((r, i) => (
                <button
                  key={r.roomId}
                  type="button"
                  style={{
                    ...styles.dot,
                    background: i === roomIdx ? '#2C1810' : 'rgba(92,61,46,0.2)',
                  }}
                  onClick={() => setRoomIdx(i)}
                  title={r.roomName}
                />
              ))}
            </div>
          )}
        </>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 15,
    fontWeight: 600,
    color: '#2C1810',
  },
  count: {
    fontSize: 11,
    color: '#C17F3C',
    background: '#FFF7E8',
    border: '1px solid rgba(193,127,60,0.16)',
    borderRadius: 999,
    padding: '3px 8px',
  },
  empty: {
    textAlign: 'center',
    padding: '24px 16px',
    fontSize: 13,
    color: '#9A8470',
    background: '#FEFCF8',
    borderRadius: 14,
    border: '1px dashed rgba(92,61,46,0.15)',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(96px, 1.1fr) minmax(0, 1fr) minmax(0, 1fr)',
    gap: 8,
    alignItems: 'stretch',
  },
  col1: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  cover: {
    position: 'relative',
    flex: 1,
    minHeight: 140,
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  coverShade: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)',
    pointerEvents: 'none',
  },
  profileWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
    padding: '0 6px',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(254,252,248,0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px solid rgba(254,252,248,0.9)',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  profileName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#FEFCF8',
    textAlign: 'center',
    textShadow: '0 1px 3px rgba(0,0,0,0.45)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  applyBtn: {
    width: '100%',
    padding: '8px 0',
    borderRadius: 10,
    border: 'none',
    background: '#2C1810',
    color: '#FEFCF8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  arrows: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  arrowBtn: {
    width: 32,
    height: 28,
    borderRadius: 8,
    border: '1px solid rgba(92,61,46,0.12)',
    background: '#FEFCF8',
    color: '#2C1810',
    fontSize: 14,
    cursor: 'pointer',
  },
  arrowHint: { fontSize: 10, color: '#9A8470' },
  colPost: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  roomTag: {
    fontSize: 10,
    color: '#9A8470',
    paddingLeft: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  postEmpty: {
    flex: 1,
    minHeight: 120,
    borderRadius: 14,
    border: '1px dashed rgba(92,61,46,0.15)',
    background: '#FEFCF8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#9A8470',
  },
  dots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer' },
}
