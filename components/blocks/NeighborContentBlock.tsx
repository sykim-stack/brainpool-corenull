'use client'

import { useEffect, useState } from 'react'
import PostBlock, { PostBlockData } from '@/components/blocks/PostBlock'

// ─────────────────────────────────────────────────────────────
// NeighborContentBlock — 골목(마당)/복도(거실) 공용 블록.
//
// [feat/house-images · 골목 v2]
// 1 | 2 | 3 레이아웃 (새 파일 없음, 이 블록 확장)
//   1 = 골목/복도 이미지 + 이웃 프로필 히어로 + ←→ (이웃 전환)
//   2 = 이웃 방 최신글 ① (PostBlock 재사용)
//   3 = 이웃 방 최신글 ② (PostBlock 재사용)
//   · · · = 방 전환 (현재 이웃 안에서만)
//
// 화살표 = "누구를 만날 것인가"  → 1·2·3 전체 교체
// 점     = "그 사람의 어느 방을 볼 것인가" → 2·3만 교체
//
// Poster(6요소 현관)는 이번 범위 아님. 2·3은 기존 PostBlock View.
// fetch 없음 — 호출부가 neighbors(+rooms/posts)를 내려준다.
// ─────────────────────────────────────────────────────────────

export interface NeighborRoomSlot {
  roomId: string
  roomName: string
  /** 이 방의 최신 원본 1건 — 없으면 빈 칸 */
  latestPost?: PostBlockData | null
}

export interface NeighborChip {
  neighborId: string
  houseId: string
  title: string
  langFlag?: string
  /** House.avatar_url */
  avatarUrl?: string | null
  /** tier=public → yard_image_url / tier=invite → living_image_url */
  coverUrl?: string | null
  rooms?: NeighborRoomSlot[]
}

export interface NeighborContentBlockProps {
  tier: 'public' | 'invite'
  neighbors: NeighborChip[]
  onNeighborClick: (houseId: string) => void
  onPostClick?: (postId: string) => void
}

const TIER_LABEL: Record<NeighborContentBlockProps['tier'], string> = {
  public: '골목',
  invite: '복도',
}

const COVER_GRADIENT: Record<NeighborContentBlockProps['tier'], string> = {
  public: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
  invite: 'linear-gradient(135deg, #5C4A35 0%, #8A6F52 60%, #D8C4A8 100%)',
}

export default function NeighborContentBlock({
  tier,
  neighbors,
  onNeighborClick,
  onPostClick,
}: NeighborContentBlockProps) {
  const [neighborIdx, setNeighborIdx] = useState(0)
  const [roomIdx, setRoomIdx] = useState(0)

  // 이웃 목록이 바뀌면 인덱스 클램프
  useEffect(() => {
    if (neighborIdx >= neighbors.length) setNeighborIdx(Math.max(0, neighbors.length - 1))
  }, [neighbors.length, neighborIdx])

  const current = neighbors[neighborIdx] || null
  const rooms = current?.rooms || []

  useEffect(() => {
    setRoomIdx(0)
  }, [neighborIdx, current?.neighborId])

  useEffect(() => {
    if (roomIdx >= rooms.length) setRoomIdx(Math.max(0, rooms.length - 1))
  }, [rooms.length, roomIdx])

  // 점 = 방. 2·3열은 연속된 두 방의 최신글
  const postA = rooms[roomIdx]?.latestPost || null
  const postB = rooms[roomIdx + 1]?.latestPost || null
  const roomNameA = rooms[roomIdx]?.roomName
  const roomNameB = rooms[roomIdx + 1]?.roomName

  const goNeighbor = (dir: -1 | 1) => {
    if (neighbors.length === 0) return
    setNeighborIdx((i) => (i + dir + neighbors.length) % neighbors.length)
  }

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{TIER_LABEL[tier]}</span>
        {neighbors.length > 0 && <span style={styles.count}>{neighbors.length}</span>}
      </div>

      {neighbors.length === 0 ? (
        <div style={styles.empty}>아직 이웃이 없어요</div>
      ) : (
        <>
          {/* 1 | 2 | 3 */}
          <div style={styles.row}>
            {/* ── 1: 골목/복도 + 프로필 ── */}
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
                      <img
                        src={current.avatarUrl}
                        alt=""
                        style={styles.avatarImg}
                      />
                    ) : (
                      <span style={{ fontSize: 22 }}>{current?.langFlag || '🏡'}</span>
                    )}
                  </div>
                  <div style={styles.profileName}>{current?.title}</div>
                </div>
              </div>
              <div style={styles.arrows}>
                <button
                  type="button"
                  style={styles.arrowBtn}
                  onClick={() => goNeighbor(-1)}
                  aria-label="이전 이웃"
                >
                  ←
                </button>
                <span style={styles.arrowHint}>
                  {neighborIdx + 1}/{neighbors.length}
                </span>
                <button
                  type="button"
                  style={styles.arrowBtn}
                  onClick={() => goNeighbor(1)}
                  aria-label="다음 이웃"
                >
                  →
                </button>
              </div>
            </div>

            {/* ── 2: 방 최신글 ① ── */}
            <div style={styles.colPost}>
              {roomNameA && <div style={styles.roomTag}>{roomNameA}</div>}
              {postA ? (
                <PostBlock
                  post={postA}
                  showViewMeta={false}
                  showComments={false}
                  onClick={() => onPostClick?.(postA.id)}
                />
              ) : (
                <div style={styles.postEmpty}>
                  {rooms.length === 0 ? '공개 방 없음' : '글 없음'}
                </div>
              )}
            </div>

            {/* ── 3: 방 최신글 ② ── */}
            <div style={styles.colPost}>
              {roomNameB && <div style={styles.roomTag}>{roomNameB}</div>}
              {postB ? (
                <PostBlock
                  post={postB}
                  showViewMeta={false}
                  showComments={false}
                  onClick={() => onPostClick?.(postB.id)}
                />
              ) : (
                <div style={styles.postEmpty}>
                  {rooms.length <= 1 ? '—' : '글 없음'}
                </div>
              )}
            </div>
          </div>

          {/* 점 = 방 이동 (2칸 슬라이드 시작 인덱스) */}
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
                  aria-label={r.roomName}
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
  col1: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
  },
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
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
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
  arrows: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
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
  arrowHint: {
    fontSize: 10,
    color: '#9A8470',
  },
  colPost: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
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
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
}
