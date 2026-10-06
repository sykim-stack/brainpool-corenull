'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getOwnerKey } from '@/lib/ownerKey'
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

export default function RoomClient() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()

  const [room, setRoom] = useState<Room | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [ownerKey, setOwnerKey] = useState('')

  const isOwner = house?.owner_key === ownerKey
  const canWrite = isOwner || isMember
  const countdown = room?.seed_mode ? getCountdown(room.bloom_date) : null

  const goToLiving = () => {
    if (house?.id) router.push(`/houses/${house.id}/living`)
    else router.push('/living')
  }

  useEffect(() => {
    const ownerKey = getOwnerKey()
    setOwnerKey(ownerKey)
    if (!roomId) return
    // Membership은 Owner에 귀속 (device_id 컬럼 = Owner ID). Device ID로 조회하지 않는다.
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
          const mRes = await fetch(
            `/api/corenull/members?house_id=${rData.room.house_id}&device_id=${encodeURIComponent(ownerKey)}&room_id=${roomId}`
          )
          const mData = await mRes.json()
          setIsMember(!mData._error && mData.is_member === true)
        } else {
          setIsMember(false)
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
          open={showShare}
          onClose={() => setShowShare(false)}
          roomId={roomId}
          roomName={room.room_name}
          houseId={room.house_id}
        />
      )}

      {showSettings && room && house && (
        <RoomSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          room={room}
          house={house}
          ownerKey={ownerKey}
          isOwner={isOwner}
          onUpdated={() => fetchRoom(ownerKey)}
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
