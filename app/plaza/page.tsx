'use client'

// 광장 = 비이웃 발견·신청 + 관계 관리 + 공개방 둘러보기
// 새 카드/프리미티브 없음. NeighborContentBlock · RoomCard · 마당 관계 UI 재사용.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import NeighborContentBlock, { NeighborChip, NeighborRoomSlot } from '@/components/blocks/NeighborContentBlock'
import RoomCard from '@/components/corenull/RoomCard'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import type { YardRelationRow } from '@/components/blocks/YardBlock'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

/** 한 화면: 가로3 × 세로2 = 6. 1~6은 있는 만큼, 7+는 6개씩 스와이프 */
const PUBLIC_ROOMS_PAGE = 6

function isYardVisibleRoom(rm: any) {
  return rm.visibility === 'public' || rm.visibility === 'invite'
}

function roomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

async function loadHouseRoomSlots(h: any): Promise<NeighborRoomSlot[]> {
  try {
    const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
    const list = (rd.data || []).filter(isYardVisibleRoom).slice(0, 6)
    return Promise.all(
      list.map(async (rm: any) => {
        const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
        const latest = (pd.data || [])[0]
        return {
          roomId: rm.id,
          roomName: rm.room_name,
          latestPost: latest
            ? ({
                id: latest.id,
                content: latest.content,
                media: latest.meta?.media,
                created_at: latest.created_at,
                comment_count: latest.comment_count ?? 0,
                room_id: rm.id,
                view_meta: {
                  room_name: rm.room_name,
                  house_name: h.title,
                  status: roomStatusLabel(rm),
                  stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
                },
              } as PostBlockData)
            : null,
        }
      })
    )
  } catch {
    return []
  }
}

export default function PlazaPage() {
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [recommended, setRecommended] = useState<NeighborChip[]>([])
  const [applyLoadingHouseId, setApplyLoadingHouseId] = useState<string | null>(null)

  const [relations, setRelations] = useState<YardRelationRow[]>([])
  const [relationActingId, setRelationActingId] = useState<string | null>(null)
  const [relTab, setRelTab] = useState<'accepted' | 'sent' | 'received'>('accepted')

  const [publicRooms, setPublicRooms] = useState<any[]>([])
  const [publicPage, setPublicPage] = useState(0)

  const loadAll = useCallback(async (key: string) => {
    const d = await fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json())
    const myHouse = d.data?.[0]
    if (!myHouse) {
      setLoading(false)
      return
    }
    setHouse(myHouse)

    const [nb, disc, plaza] = await Promise.all([
      fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`).then((res) => res.json()),
      fetch(`/api/corenull/houses?action=discover&house_id=${myHouse.id}`).then((res) => res.json()),
      fetch('/api/corenull/rooms?scope=plaza&limit=60').then((res) => res.json()),
    ])

    const nbRows = nb.data || []
    setRelations(
      nbRows
        .filter((n: any) => n.house)
        .map((n: any) => ({
          id: n.id,
          status: n.status,
          direction: n.direction,
          title: n.house.title,
          houseId: n.house.id,
        }))
    )

    const pendingTargetIds = new Set(
      nbRows.filter((n: any) => n.status === 'pending' && n.house).map((n: any) => n.house.id)
    )
    const acceptedHouseIds = new Set(
      nbRows.filter((n: any) => n.status === 'accepted' && n.house).map((n: any) => n.house.id)
    )

    const discHouses = disc.data || []
    const rec: NeighborChip[] = await Promise.all(
      discHouses.map(async (h: any) => {
        const roomSlots = await loadHouseRoomSlots(h)
        return {
          neighborId: `plaza-${h.id}`,
          houseId: h.id,
          title: h.title,
          langFlag: LANG_FLAG[h.primary_language] || '🌐',
          avatarUrl: h.avatar_url || null,
          coverUrl: h.yard_image_url || null,
          rooms: roomSlots,
          requestPending: pendingTargetIds.has(h.id),
        }
      })
    )
    setRecommended(rec)

    const list = plaza.data || []
    const sorted = [...list]
      .filter((rm: any) => {
        const hid = rm.house_id
        if (!hid) return false
        if (hid === myHouse.id) return false
        if (acceptedHouseIds.has(hid)) return false
        return true
      })
      .sort((a: any, b: any) => {
        const at = a.latest_message?.created_at
          ? new Date(a.latest_message.created_at).getTime()
          : 0
        const bt = b.latest_message?.created_at
          ? new Date(b.latest_message.created_at).getTime()
          : 0
        return bt - at
      })

    setPublicRooms(sorted)
    setPublicPage(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!key) {
      setLoading(false)
      return
    }
    loadAll(key)
  }, [loadAll])

  const handleApplyNeighbor = async (targetHouseId: string) => {
    if (!house || !ownerKey || applyLoadingHouseId) return
    setApplyLoadingHouseId(targetHouseId)
    const res = await fetch('/api/corenull/houses?action=neighbor-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_a_id: house.id, owner_key: ownerKey, house_b_id: targetHouseId }),
    })
    const data = await res.json()
    if (data.data) {
      setRecommended((prev) =>
        prev.map((x) => (x.houseId === targetHouseId ? { ...x, requestPending: true } : x))
      )
      await loadAll(ownerKey)
    }
    setApplyLoadingHouseId(null)
  }

  const handleAcceptRelation = async (neighborId: string) => {
    if (relationActingId) return
    setRelationActingId(neighborId)
    await fetch('/api/corenull/houses?action=neighbor-accept', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighbor_id: neighborId, owner_key: ownerKey }),
    })
    await loadAll(ownerKey)
    setRelationActingId(null)
  }

  const handleRemoveRelation = async (neighborId: string) => {
    if (relationActingId) return
    setRelationActingId(neighborId)
    await fetch(
      `/api/corenull/houses?action=neighbor-remove&neighbor_id=${neighborId}&owner_key=${ownerKey}`,
      { method: 'DELETE' }
    )
    await loadAll(ownerKey)
    setRelationActingId(null)
  }

  const handlePostClick = (postId: string, roomId?: string) => {
    if (roomId) router.push(`/rooms/${roomId}`)
    else router.push(`/posts/${postId}`)
  }

  const received = relations.filter((r) => r.status === 'pending' && r.direction === 'incoming')
  const sent = relations.filter((r) => r.status === 'pending' && r.direction === 'outgoing')
  const accepted = relations.filter((r) => r.status === 'accepted')
  const relList = relTab === 'accepted' ? accepted : relTab === 'sent' ? sent : received
  const relShow = relList.slice(0, 5)

  // 1~6: 있는 만큼(3×2 그리드). 7+: 페이지당 6, 스와이프
  const needsSwipe = publicRooms.length > PUBLIC_ROOMS_PAGE
  const pageCount = needsSwipe
    ? Math.ceil(publicRooms.length / PUBLIC_ROOMS_PAGE)
    : 1
  const safePage = Math.min(publicPage, Math.max(0, pageCount - 1))
  const visibleRooms = needsSwipe
    ? publicRooms.slice(safePage * PUBLIC_ROOMS_PAGE, safePage * PUBLIC_ROOMS_PAGE + PUBLIC_ROOMS_PAGE)
    : publicRooms

  useEffect(() => {
    if (publicPage >= pageCount) setPublicPage(Math.max(0, pageCount - 1))
  }, [pageCount, publicPage])

  const gridCount =
    visibleRooms.length >= 3 ? 'many' : String(Math.max(1, visibleRooms.length))

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="광장"
        actions={[
          {
            key: 'home',
            emoji: '🏠',
            label: '나의 마당',
            onClick: () => router.push('/yard'),
          },
        ]}
      />

      {loading ? (
        <div style={styles.loading}>🏛️</div>
      ) : (
        <>
          <NeighborContentBlock
            tier="public"
            mode="recommend"
            neighbors={recommended}
            onNeighborClick={(houseId) => router.push(`/houses/${houseId}/yard`)}
            onPostClick={handlePostClick}
            onApplyNeighbor={handleApplyNeighbor}
            applyLoadingHouseId={applyLoadingHouseId}
          />

          <section style={styles.relationSection}>
            <div style={styles.relationHeader}>
              <span style={styles.relationTitle}>이웃 관계</span>
              <button type="button" style={styles.relationMore} onClick={() => router.push('/me/neighbors')}>
                전체 ›
              </button>
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
              <div style={styles.relationEmpty}>신청·이웃이 여기 모입니다</div>
            ) : (
              <div style={styles.relationList}>
                {relShow.map((r) => (
                  <div key={r.id} style={styles.relationRow}>
                    <span style={styles.relationName}>{r.title}</span>
                    {relTab === 'received' && (
                      <>
                        <button
                          type="button"
                          style={styles.relAccept}
                          disabled={relationActingId === r.id}
                          onClick={() => handleAcceptRelation(r.id)}
                        >
                          수락
                        </button>
                        <button
                          type="button"
                          style={styles.relGhost}
                          disabled={relationActingId === r.id}
                          onClick={() => handleRemoveRelation(r.id)}
                        >
                          거절
                        </button>
                      </>
                    )}
                    {relTab === 'sent' && (
                      <button
                        type="button"
                        style={styles.relGhost}
                        disabled={relationActingId === r.id}
                        onClick={() => handleRemoveRelation(r.id)}
                      >
                        취소
                      </button>
                    )}
                    {relTab === 'accepted' && (
                      <>
                        <span style={styles.badgeOk}>이웃</span>
                        {r.houseId && (
                          <>
                            <button
                              type="button"
                              style={styles.relAccept}
                              onClick={() => router.push(`/houses/${r.houseId}/yard`)}
                            >
                              마당
                            </button>
                            <button
                              type="button"
                              style={styles.relGhost}
                              onClick={() => router.push(`/houses/${r.houseId}/living`)}
                            >
                              거실
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 비이웃 공개방: 3열×2행(최대6) — 내 방 최신과 동일 그리드 리듬 */}
          <section style={styles.publicSection}>
            <div style={styles.publicHeader}>
              <span style={styles.relationTitle}>비이웃 공개방 최신</span>
              {publicRooms.length > 0 && (
                <span style={styles.publicHint}>
                  {needsSwipe
                    ? `${safePage + 1}/${pageCount} · 더보기`
                    : `${publicRooms.length}개`}
                </span>
              )}
            </div>
            {publicRooms.length === 0 ? (
              <div style={{ ...styles.relationEmpty, margin: '0 16px' }}>
                아직 둘러볼 공개 방이 없어요
              </div>
            ) : (
              <div style={styles.setStage}>
                {needsSwipe && (
                  <>
                    <button
                      type="button"
                      style={{ ...styles.setArrow, left: 4 }}
                      onClick={() => setPublicPage((p) => (p - 1 + pageCount) % pageCount)}
                      aria-label="이전"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.setArrow, right: 4 }}
                      onClick={() => setPublicPage((p) => (p + 1) % pageCount)}
                      aria-label="다음"
                    >
                      ›
                    </button>
                  </>
                )}

                <div className="cn-post-grid" data-count={gridCount}>
                  {visibleRooms.map((room: any) => (
                    <div key={room.id} style={styles.setCard}>
                      <RoomCard
                        room={room}
                        houseName={room.corenull_houses?.title || null}
                        onClick={() => router.push(`/houses/${room.house_id}/yard`)}
                      />
                      <button
                        type="button"
                        style={styles.morePosts}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/rooms/${room.id}`)
                        }}
                      >
                        글 더보기 ›
                      </button>
                    </div>
                  ))}
                </div>

                {needsSwipe && (
                  <div style={styles.setDots}>
                    {Array.from({ length: pageCount }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        style={{
                          ...styles.setDot,
                          background: i === safePage ? '#2C1810' : 'rgba(92,61,46,0.2)',
                        }}
                        onClick={() => setPublicPage(i)}
                        aria-label={`페이지 ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
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
  relationSection: { padding: '16px', borderTop: '1px solid rgba(92,61,46,0.08)' },
  relationHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  relationTitle: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 15,
    fontWeight: 600,
    color: '#2C1810',
  },
  relationMore: {
    border: 'none',
    background: 'none',
    color: '#9A8470',
    fontSize: 12,
    cursor: 'pointer',
  },
  relationEmpty: {
    fontSize: 13,
    color: '#9A8470',
    padding: '16px',
    textAlign: 'center',
    background: '#FEFCF8',
    borderRadius: 12,
    border: '1px dashed rgba(92,61,46,0.12)',
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
  relationList: { display: 'flex', flexDirection: 'column', gap: 8 },
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
  badgeOk: {
    fontSize: 10,
    color: '#4A5240',
    background: 'rgba(74,82,64,0.12)',
    padding: '2px 8px',
    borderRadius: 999,
    flexShrink: 0,
  },
  relAccept: {
    border: 'none',
    background: '#2C1810',
    color: '#fff',
    fontSize: 11,
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    flexShrink: 0,
  },
  relGhost: {
    border: '1px solid rgba(92,61,46,0.12)',
    background: '#fff',
    color: '#5C4A35',
    fontSize: 11,
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    flexShrink: 0,
  },
  publicSection: {
    padding: '16px 0 28px',
    borderTop: '1px solid rgba(92,61,46,0.08)',
  },
  publicHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    marginBottom: 12,
  },
  publicHint: { fontSize: 11, color: '#9A8470' },
  setStage: {
    position: 'relative',
    padding: '0 16px',
  },
  setArrow: {
    position: 'absolute',
    top: '40%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    width: 28,
    height: 36,
    borderRadius: 10,
    border: '1px solid rgba(92,61,46,0.12)',
    background: 'rgba(254,252,248,0.95)',
    color: '#2C1810',
    fontSize: 20,
    lineHeight: '36px',
    padding: 0,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(44,24,16,0.08)',
  },
  setCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  setDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  setDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  morePosts: {
    border: 'none',
    background: 'none',
    color: '#9A8470',
    fontSize: 12,
    cursor: 'pointer',
    padding: '2px 2px 0',
    textAlign: 'left',
  },
}
