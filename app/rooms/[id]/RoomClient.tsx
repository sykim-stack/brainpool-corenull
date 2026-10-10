'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getOwnerKey } from '@/lib/ownerKey'
import { getDeviceId } from '@/lib/deviceId'
import { adaptRoomStage, computeStage } from '@/lib/roomStage'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import RoomSettingsModal from '@/components/corenull/RoomSettingsModal'
import PostBlock, { PostBlockData } from '@/components/blocks/PostBlock'
import MyContentBlock from '@/components/blocks/MyContentBlock'

type Room = {
  id: string
  room_name: string
  visibility: 'public' | 'invite' | 'private'
  seed_mode: boolean
  bloom_date: string | null
  slug: string | null
  house_id: string
  created_at: string
  harvested?: boolean
}

type House = {
  id: string
  title: string
  primary_language: string
  owner_key: string
  avatar_url?: string | null
}

type Post = {
  id: string
  content: string
  type: string
  created_at: string
  owner_key: string
  meta?: { media?: any; archived?: boolean; deleted?: boolean }
  comment_count?: number
}

type Participant = {
  key: string
  label: string
  isHouseOwner: boolean
  postCount: number
  avatarUrl?: string | null
  color: string
}

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

const DOT_COLORS = ['#8C4B37', '#5C6B4C', '#A6813F', '#6B5B95', '#3A6EA5', '#C17F3C']

function colorForKey(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return DOT_COLORS[hash % DOT_COLORS.length]
}

function shortLabel(key: string, isOwner: boolean, houseTitle?: string) {
  if (isOwner) return houseTitle || '집주인'
  if (!key) return '참여자'
  return `참여자 ${key.slice(0, 4)}`
}

const STAGE_KO: Record<string, string> = {
  seed: '씨드',
  growth: '성장',
  flower: '꽃',
  fruit: '열매',
}

export default function RoomClient() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()

  const [room, setRoom] = useState<Room | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [memberKeys, setMemberKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [ownerKey, setOwnerKey] = useState('')
  const [filterKey, setFilterKey] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'block'>('list')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('corenull_room_view')
      if (saved === 'list' || saved === 'block') setViewMode(saved)
    } catch {}
  }, [])

  const setViewModePersist = (mode: 'list' | 'block') => {
    setViewMode(mode)
    try { localStorage.setItem('corenull_room_view', mode) } catch {}
  }

  const isOwner = house?.owner_key === ownerKey
  const canWrite = isOwner || isMember

  const stageInfo = useMemo(() => {
    if (!room) return null
    const adapted = adaptRoomStage(room, {
      participantIds: memberKeys,
      harvested: !!room.harvested,
    })
    return computeStage(adapted)
  }, [room, memberKeys])

  const participants: Participant[] = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      if (!p.owner_key) continue
      counts[p.owner_key] = (counts[p.owner_key] || 0) + 1
    }
    const keys = new Set<string>([...memberKeys, ...Object.keys(counts)])
    if (house?.owner_key) keys.add(house.owner_key)

    return Array.from(keys)
      .filter(Boolean)
      .map((key) => {
        const isHouseOwner = key === house?.owner_key
        return {
          key,
          label: shortLabel(key, isHouseOwner, house?.title),
          isHouseOwner,
          postCount: counts[key] || 0,
          avatarUrl: isHouseOwner ? house?.avatar_url || null : null,
          color: colorForKey(key),
        }
      })
      .sort((a, b) => {
        if (a.isHouseOwner !== b.isHouseOwner) return a.isHouseOwner ? -1 : 1
        return b.postCount - a.postCount
      })
  }, [posts, memberKeys, house])

  const visiblePosts = useMemo(() => {
    if (!filterKey) return posts
    return posts.filter((p) => p.owner_key === filterKey)
  }, [posts, filterKey])

  const goToLiving = () => {
    if (house?.id) router.push(`/houses/${house.id}/living`)
    else router.push('/living')
  }

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key || '')
    if (!roomId) return
    fetchRoom(key || '')
  }, [roomId])

  async function fetchRoom(ok: string) {
    setLoading(true)
    setError(null)
    try {
      const rRes = await fetch(`/api/corenull/rooms?room_id=${roomId}`)
      const rData = await rRes.json()
      if (rData._error || !rData.room) {
        setError('방을 찾을 수 없어요.')
        setLoading(false)
        return
      }
      setRoom(rData.room)

      const hRes = await fetch(`/api/corenull/houses?house_id=${rData.room.house_id}`)
      const hData = await hRes.json()
      if (!hData._error && hData.house) {
        setHouse(hData.house)
        if (ok) {
          const deviceId = getDeviceId()
          const mRes = await fetch(
            `/api/corenull/members?house_id=${rData.room.house_id}&device_id=${encodeURIComponent(deviceId || ok)}&owner_key=${encodeURIComponent(ok)}&room_id=${roomId}`
          )
          const mData = await mRes.json()
          setIsMember(!mData._error && mData.is_member === true)
        } else {
          setIsMember(false)
        }

        const listRes = await fetch(
          `/api/corenull/members?house_id=${rData.room.house_id}&room_id=${roomId}`
        )
        const listData = await listRes.json()
        const keys = (listData.data || [])
          .map((m: any) => m.device_id)
          .filter(Boolean)
        setMemberKeys(Array.from(new Set(keys)) as string[])
      }

      const pRes = await fetch(`/api/corenull/posts?room_id=${roomId}&owner_key=${ok}`)
      const pData = await pRes.json()
      if (!pData._error && pData.data) {
        setPosts(pData.data.filter((p: Post) => !p.meta?.archived && !p.meta?.deleted))
      }
    } catch {
      setError('불러오는 중 문제가 생겼어요.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <p style={{ color: '#9A8470', fontSize: '14px' }}>불러오는 중...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '12px' }}>
        <p style={{ color: '#5C3D2E', fontSize: '14px' }}>{error || '방을 찾을 수 없어요.'}</p>
        <button type="button" onClick={goToLiving} style={btnSecondary}>거실로</button>
      </div>
    )
  }

  const isParticipationRoom = !!room.seed_mode || participants.length > 1

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title={room.room_name} />

      <div style={metaStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {house && (
            <button type="button" onClick={goToLiving} style={metaHouseBtn}>
              {LANG_FLAG[house.primary_language] || '🏡'} {house.title}
            </button>
          )}
          <span style={{ fontSize: 12, color: '#9A8470' }}>
            {room.visibility === 'public' ? '공개' : room.visibility === 'invite' ? '이웃공개' : '비공개'}
          </span>
          {stageInfo && stageInfo.stage !== 'none' && (
            <span style={stageBadge}>
              {stageInfo.emoji} {STAGE_KO[stageInfo.stage] || stageInfo.stage}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => setShowShare(true)} style={iconBtn} aria-label="공유">
            🔗
          </button>
          {canWrite && (
            <button type="button" onClick={() => setShowSettings(true)} style={iconBtn} aria-label="설정">
              ⚙️
            </button>
          )}
          {canWrite && (
            <Link href={`/write?room_id=${roomId}`} style={writeBtnStyle}>
              + 글쓰기
            </Link>
          )}
        </div>
      </div>

      {isParticipationRoom && participants.length > 0 && (
        <section style={participantSection}>
          <div style={participantHeader}>
            <span style={participantTitle}>참여자 {participants.length}</span>
            {filterKey && (
              <button type="button" style={filterClear} onClick={() => setFilterKey(null)}>
                전체 보기
              </button>
            )}
          </div>
          <div style={participantRow}>
            {participants.map((p) => {
              const active = filterKey === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  style={{
                    ...participantChip,
                    borderColor: active ? '#2C1810' : 'rgba(92,61,46,0.12)',
                    background: active ? 'rgba(44,24,16,0.06)' : '#FEFCF8',
                  }}
                  onClick={() => setFilterKey(active ? null : p.key)}
                  title={p.label}
                >
                  <span
                    style={{
                      ...participantAvatar,
                      background: p.avatarUrl ? 'transparent' : p.color,
                    }}
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" style={participantAvatarImg} />
                    ) : (
                      <span style={{ fontSize: 14, color: '#FEFCF8' }}>
                        {p.isHouseOwner ? '🏡' : p.label.slice(-1)}
                      </span>
                    )}
                  </span>
                  <span style={participantName}>{p.label}</span>
                  <span style={participantPosts}>
                    {p.postCount > 0 ? `글 ${p.postCount}` : '글 없음'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {stageInfo && room.seed_mode && stageInfo.daysLeft !== null && (
        <div style={{
          ...countdownBanner,
          background: stageInfo.stage === 'fruit' || stageInfo.stage === 'flower'
            ? 'linear-gradient(135deg, rgba(193,127,60,0.15), rgba(200,213,185,0.3))'
            : 'linear-gradient(135deg, rgba(74,82,64,0.08), rgba(193,127,60,0.08))',
          borderColor: stageInfo.stage === 'fruit' || stageInfo.stage === 'flower'
            ? 'rgba(193,127,60,0.4)'
            : 'rgba(74,82,64,0.15)',
        }}>
          <span style={{ fontSize: 20 }}>{stageInfo.emoji || '🌱'}</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 14, fontWeight: 600,
              color: stageInfo.stage === 'fruit' || stageInfo.stage === 'flower' ? '#C17F3C' : '#4A5240',
            }}>
              {stageInfo.daysLeft === 0
                ? 'D-DAY'
                : stageInfo.daysLeft > 0
                  ? `개화까지 ${stageInfo.daysLeft}일`
                  : STAGE_KO[stageInfo.stage] || stageInfo.stage}
            </div>
            {room.bloom_date && (
              <div style={{ fontSize: 11, color: '#9A8470', marginTop: 2 }}>
                {new Date(room.bloom_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      )}

      <main style={{ padding: viewMode === 'block' ? '8px 0 16px' : '16px' }}>
        {visiblePosts.length > 0 && (
          <div style={viewToggleRow}>
            <span style={viewToggleLabel}>보기</span>
            <div style={viewToggleGroup}>
              <button
                type="button"
                style={{ ...viewToggleBtn, ...(viewMode === 'list' ? viewToggleBtnActive : {}) }}
                onClick={() => setViewModePersist('list')}
              >
                리스트
              </button>
              <button
                type="button"
                style={{ ...viewToggleBtn, ...(viewMode === 'block' ? viewToggleBtnActive : {}) }}
                onClick={() => setViewModePersist('block')}
              >
                블록
              </button>
            </div>
          </div>
        )}

        {visiblePosts.length === 0 ? (
          <EmptyState isOwner={canWrite} roomId={roomId} filtered={!!filterKey} />
        ) : viewMode === 'block' ? (
          <MyContentBlock
            title=""
            layout="brick"
            posts={visiblePosts.map((post) => ({
              id: post.id,
              content: post.content || '',
              media: (post.meta?.media as any) || undefined,
              created_at: post.created_at,
              comment_count: (post as any).comment_count ?? 0,
              room_id: roomId,
              view_meta: {
                house_name: house?.title,
                room_name: room.room_name,
                status: stageInfo && stageInfo.stage !== 'none'
                  ? STAGE_KO[stageInfo.stage]
                  : undefined,
                stage_emoji: stageInfo?.emoji || undefined,
                relation: participants.find((p) => p.key === post.owner_key)?.label,
              },
            }))}
            emptyLabel="아직 이야기가 없어요"
            showInterest
            enableInlineComment
            ownerKey={ownerKey}
            onPostClick={(postId) => router.push(`/posts/${postId}`)}
            onCommentClick={(postId) => router.push(`/posts/${postId}`)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visiblePosts.map((post) => {
              const author = participants.find((p) => p.key === post.owner_key)
              return (
                <div key={post.id} style={{ position: 'relative' }}>
                  {isParticipationRoom && author && (
                    <div style={authorStrip}>
                      <span style={{ ...authorDot, background: author.color }} />
                      <span style={authorLabel}>{author.label}</span>
                      {author.isHouseOwner && <span style={authorOwnerTag}>집</span>}
                    </div>
                  )}
                  <PostBlock
                    post={{
                      id: post.id,
                      content: post.content || '',
                      media: (post.meta?.media as any) || undefined,
                      created_at: post.created_at,
                      comment_count: (post as any).comment_count ?? 0,
                      room_id: roomId,
                      view_meta: {
                        house_name: house?.title,
                        room_name: room.room_name,
                        status: stageInfo && stageInfo.stage !== 'none'
                          ? STAGE_KO[stageInfo.stage]
                          : undefined,
                        stage_emoji: stageInfo?.emoji || undefined,
                      },
                    }}
                    showInterest
                    enableInlineComment
                    ownerKey={ownerKey}
                    onClick={() => router.push(`/posts/${post.id}`)}
                    onCommentClick={() => router.push(`/posts/${post.id}`)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showShare && room && (
        <ShareModal
          url={typeof window !== 'undefined' ? window.location.href : `https://corenull.vercel.app/rooms/${roomId}`}
          title={room.room_name}
          onClose={() => setShowShare(false)}
        />
      )}

      {showSettings && room && house && (
        <RoomSettingsModal
          roomId={roomId}
          roomName={room.room_name}
          visibility={room.visibility}
          seedMode={!!room.seed_mode}
          houseId={room.house_id}
          ownerKey={ownerKey}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onUpdate={(updated) => {
            setRoom((prev) => prev ? { ...prev, ...updated } : prev)
            setShowSettings(false)
          }}
          onLeft={() => router.push('/living')}
        />
      )}
    </div>
  )
}

function EmptyState({ isOwner, roomId, filtered }: { isOwner: boolean; roomId: string; filtered?: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#9A8470' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
      <p style={{ fontSize: 14, marginBottom: 16 }}>
        {filtered ? '이 참여자가 쓴 글이 없어요' : '아직 이야기가 없어요'}
      </p>
      {isOwner && !filtered && (
        <Link href={`/write?room_id=${roomId}`} style={writeBtnStyle}>첫 글 쓰기</Link>
      )}
    </div>
  )
}

const metaStrip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 16px', gap: 8,
  borderBottom: '1px solid rgba(92,61,46,0.08)', background: '#FEFCF8',
}
const metaHouseBtn: React.CSSProperties = {
  border: 'none', background: 'transparent', cursor: 'pointer',
  fontSize: 13, color: '#5C3D2E', fontWeight: 500, padding: 0,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
}
const stageBadge: React.CSSProperties = {
  fontSize: 11, color: '#5C4A35', background: 'rgba(92,61,46,0.08)',
  padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
}
const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(92,61,46,0.12)',
  background: '#FEFCF8', cursor: 'pointer', fontSize: 16,
}
const writeBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px 14px', borderRadius: 10, background: '#2C1810', color: '#FEFCF8',
  fontSize: 13, fontWeight: 600, textDecoration: 'none', border: 'none', cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(92,61,46,0.2)',
  background: '#FEFCF8', color: '#5C3D2E', cursor: 'pointer', fontSize: 13,
}
const countdownBanner: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, margin: '12px 16px',
  padding: '12px 14px', borderRadius: 12, border: '1px solid',
  background: '#fef3e2', color: '#C17F3C', fontWeight: 600,
}
const participantSection: React.CSSProperties = {
  padding: '14px 16px 10px',
  borderBottom: '1px solid rgba(92,61,46,0.08)',
  background: 'rgba(255,255,255,0.5)',
}
const participantHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
}
const participantTitle: React.CSSProperties = {
  fontFamily: "'Noto Serif KR', serif", fontSize: 14, fontWeight: 600, color: '#2C1810',
}
const filterClear: React.CSSProperties = {
  border: 'none', background: 'none', color: '#C17F3C', fontSize: 12, cursor: 'pointer', padding: 0,
}
const participantRow: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', gap: 10, overflowX: 'auto',
  paddingBottom: 4, WebkitOverflowScrolling: 'touch',
}
const participantChip: React.CSSProperties = {
  flexShrink: 0, width: 72, border: '1.5px solid', borderRadius: 14,
  padding: '8px 6px', cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
}
const participantAvatar: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const participantAvatarImg: React.CSSProperties = {
  width: '100%', height: '100%', objectFit: 'cover',
}
const participantName: React.CSSProperties = {
  fontSize: 10, color: '#5C4A35', maxWidth: 64, overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
}
const participantPosts: React.CSSProperties = {
  fontSize: 9, color: '#9A8470',
}
const authorStrip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, paddingLeft: 2,
}
const authorDot: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
}
const authorLabel: React.CSSProperties = {
  fontSize: 11, color: '#9A8470',
}
const authorOwnerTag: React.CSSProperties = {
  fontSize: 9, color: '#C17F3C', background: 'rgba(193,127,60,0.12)',
  padding: '1px 5px', borderRadius: 4,
}

const viewToggleRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 12,
  padding: '0 16px',
}
const viewToggleLabel: React.CSSProperties = {
  fontSize: 11, color: '#9A8470',
}
const viewToggleGroup: React.CSSProperties = {
  display: 'flex', borderRadius: 10, overflow: 'hidden',
  border: '1px solid rgba(92,61,46,0.15)',
}
const viewToggleBtn: React.CSSProperties = {
  border: 'none', background: '#FEFCF8', color: '#9A8470',
  fontSize: 12, padding: '6px 12px', cursor: 'pointer',
}
const viewToggleBtnActive: React.CSSProperties = {
  background: '#2C1810', color: '#FEFCF8', fontWeight: 600,
}
