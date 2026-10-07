'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getOwnerKey } from '@/lib/ownerKey'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import ShareModal from '@/components/corenull/ShareModal'
import RoomSettingsModal from '@/components/corenull/RoomSettingsModal'
import PostBlock from '@/components/blocks/PostBlock'

type Room = {
  id: string
  room_name: string
  visibility: 'public' | 'invite' | 'private'
  seed_mode: boolean
  bloom_date: string | null
  slug: string | null
  house_id: string
  created_at: string
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
  device_id: string
  room_id: string | null
  joined_at?: string
  house?: {
    id: string
    title: string
    avatar_url?: string | null
    primary_language?: string
  } | null
}

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function getCountdown(bloomDate: string | null) {
  if (!bloomDate) return null
  const end = new Date(bloomDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return { bloomed: true, label: '꽃이 피었어요' }
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return { bloomed: false, label: `개화까지 ${days}일` }
}

function Avatar({ url, label, size = 32 }: { url?: string | null; label?: string; size?: number }) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#EFE6E1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.4,
    flexShrink: 0,
    border: '1px solid rgba(92,61,46,0.1)',
  }
  if (url) {
    return <img src={url} alt={label || ''} style={style} />
  }
  return (
    <span style={style} aria-hidden>
      {label ? label.slice(0, 1) : '🏡'}
    </span>
  )
}

export default function RoomClient() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()

  const [room, setRoom] = useState<Room | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [ownerKey, setOwnerKey] = useState('')

  const isOwner = house?.owner_key === ownerKey
  const canWrite = isOwner || isMember
  const countdown = room?.seed_mode ? getCountdown(room.bloom_date) : null

  // 참여자: room 스코프 멤버만, Creator(집 주인)는 제외
  const participantList = participants.filter(
    (p) => p.room_id === roomId && p.device_id !== house?.owner_key
  )

  const goToLiving = () => {
    if (house?.id) router.push(`/houses/${house.id}/living`)
    else router.push('/living')
  }

  const goToHouse = (houseId?: string | null) => {
    if (houseId) router.push(`/houses/${houseId}/living`)
  }

  useEffect(() => {
    const ownerKey = getOwnerKey()
    setOwnerKey(ownerKey)
    if (!roomId) return
    fetchRoom(ownerKey)
  }, [roomId])

  async function fetchRoom(ownerKey: string) {
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
        if (ownerKey) {
          const deviceId = getDeviceId()
          const mRes = await fetch(
            `/api/corenull/members?house_id=${rData.room.house_id}&device_id=${encodeURIComponent(deviceId || ownerKey)}&owner_key=${encodeURIComponent(ownerKey)}&room_id=${roomId}`
          )
          const mData = await mRes.json()
          setIsMember(!mData._error && mData.is_member === true)
        } else {
          setIsMember(false)
        }

        // 참여자 목록 (프로필 enrich 포함)
        const listRes = await fetch(
          `/api/corenull/members?house_id=${rData.room.house_id}&room_id=${roomId}`
        )
        const listData = await listRes.json()
        if (!listData._error && Array.isArray(listData.data)) {
          setParticipants(listData.data)
        }
      }

      const pRes = await fetch(`/api/corenull/posts?room_id=${roomId}&owner_key=${ownerKey}`)
      const pData = await pRes.json()
      if (!pData._error && pData.data) {
        setPosts(pData.data.filter((p: Post) => !p.meta?.archived))
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

      {countdown && (
        <div style={{
          ...countdownBanner,
          background: countdown.bloomed
            ? 'linear-gradient(135deg, rgba(193,127,60,0.15), rgba(200,213,185,0.3))'
            : 'linear-gradient(135deg, rgba(74,82,64,0.08), rgba(193,127,60,0.08))',
          borderColor: countdown.bloomed ? 'rgba(193,127,60,0.4)' : 'rgba(74,82,64,0.15)',
        }}>
          <span style={{ fontSize: 20 }}>{countdown.bloomed ? '🌸' : '🌱'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: countdown.bloomed ? '#C17F3C' : '#4A5240' }}>
              {countdown.label}
            </div>
            {room.bloom_date && (
              <div style={{ fontSize: 11, color: '#9A8470', marginTop: 2 }}>
                {new Date(room.bloom_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 만든 사람 + 참여 중 */}
      {house && (
        <div style={peopleStrip}>
          <div style={peopleRow}>
            <span style={peopleLabel}>만든 사람</span>
            <button
              type="button"
              onClick={() => goToHouse(house.id)}
              style={creatorBtn}
              aria-label={`${house.title} 거실로`}
            >
              <Avatar url={house.avatar_url} label={house.title} size={28} />
              <span style={creatorName}>{house.title}</span>
            </button>
          </div>

          {participantList.length > 0 && (
            <div style={peopleRow}>
              <span style={peopleLabel}>참여 중 ({participantList.length})</span>
              <div style={avatarRow}>
                {participantList.slice(0, 8).map((p) => {
                  const title = p.house?.title || p.device_id.slice(0, 6)
                  const avatar = p.house?.avatar_url
                  const targetHouseId = p.house?.id
                  return (
                    <button
                      key={p.device_id}
                      type="button"
                      onClick={() => goToHouse(targetHouseId)}
                      style={avatarBtn}
                      title={title}
                      aria-label={title}
                    >
                      <Avatar url={avatar} label={title} size={28} />
                    </button>
                  )
                })}
                {participantList.length > 8 && (
                  <span style={moreCount}>+{participantList.length - 8}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <main style={{ padding: '16px' }}>
        {posts.length === 0 ? (
          <EmptyState isOwner={canWrite} roomId={roomId} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posts.map((post) => (
              <PostBlock
                key={post.id}
                post={{
                  id: post.id,
                  content: post.content || '',
                  media: (post.meta?.media as any) || undefined,
                  created_at: post.created_at,
                  comment_count: (post as any).comment_count ?? 0,
                  room_id: roomId,
                }}
                onClick={() => router.push(`/posts/${post.id}`)}
                onCommentClick={() => router.push(`/posts/${post.id}`)}
              />
            ))}
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

function EmptyState({ isOwner, roomId }: { isOwner: boolean; roomId: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#9A8470' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
      <p style={{ fontSize: 14, marginBottom: 16 }}>아직 이야기가 없어요</p>
      {isOwner && (
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
const peopleStrip: React.CSSProperties = {
  margin: '0 16px',
  padding: '12px 0',
  borderBottom: '1px solid rgba(92,61,46,0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const peopleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
}
const peopleLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#9A8470',
  width: 64,
  flexShrink: 0,
}
const creatorBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  minWidth: 0,
}
const creatorName: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#2C1810',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
const avatarRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  minWidth: 0,
}
const avatarBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  lineHeight: 0,
}
const moreCount: React.CSSProperties = {
  fontSize: 11,
  color: '#9A8470',
  fontWeight: 600,
  marginLeft: 2,
}
