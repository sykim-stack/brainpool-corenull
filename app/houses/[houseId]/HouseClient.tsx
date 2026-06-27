'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import ShareModal from '@/components/corenull/ShareModal'

export default function HouseDetailPage() {
  const { houseId } = useParams()
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!houseId) return
    Promise.all([
      fetch(`/api/corenull/houses?house_id=${houseId}`).then(r => r.json()),
      fetch(`/api/corenull/rooms?house_id=${houseId}`).then(r => r.json()),
    ]).then(([h, r]) => {
      setHouse(h.house || null)
      setRooms(r.data || [])
      setLoading(false)
    })
  }, [houseId])

  const isOwner = house?.owner_key === ownerKey

  const handleInvite = async () => {
    if (inviteLoading) return
    setInviteLoading(true)
    const res = await fetch('/api/corenull/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_id: houseId, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data?.invite_token) {
      setInviteUrl(`https://corenull.vercel.app/invite/${data.data.invite_token}`)
      setShowShare(true)
    }
    setInviteLoading(false)
  }

  if (loading) return <div style={styles.loading}>?猷?/div>
  if (!house) return <div style={styles.loading}>筌욌쵐??筌≪뼚??????곷선??/div>

  const langFlag = house.primary_language === 'ko' ? '?????
    : house.primary_language === 'vi' ? '?????
    : house.primary_language === 'en' ? '?????
    : house.primary_language === 'ja' ? '?????
    : house.primary_language === 'zh' ? '????? : '???

  return (
    <div>
      {/* ??삳쐭 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>??/button>
        <span style={styles.headerTitle}>{house.title}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner && (
            <button
              style={styles.iconBtn}
              onClick={handleInvite}
              disabled={inviteLoading}
            >
              {inviteLoading ? '?? : '?逾?}
            </button>
          )}
          <button style={styles.iconBtn}>??뗮닔</button>
        </div>
      </div>

      {/* 筌??뚣끇苡?*/}
      <div style={styles.cover}>
        <div style={styles.coverEmoji}>?猷?/div>
        <div>
          <div style={styles.coverTitle}>{house.title}</div>
          <div style={styles.coverLang}>{langFlag} {house.primary_language}</div>
          {house.description && (
            <div style={styles.coverDesc}>{house.description}</div>
          )}
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.sectionTitle}>獄?/div>

        {rooms.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>???/div>
            <div style={styles.emptyText}>?袁⑹춦 獄쎻뫗????곷선??/div>
          </div>
        ) : (
          <div style={styles.roomList}>
            {rooms.map((room: any) => (
              <div
                key={room.id}
                style={styles.roomCard}
                onClick={() => router.push(`/rooms/${room.id}`)}
              >
                <div style={styles.roomIcon}>
                  {room.seed_mode ? '??? : '???}
                </div>
                <div style={styles.roomInfo}>
                  <div style={styles.roomName}>{room.room_name}</div>
                  <div style={styles.roomMeta}>
                    {room.visibility === 'public' ? '????⑤벀而? : room.visibility === 'friend' ? '?維?燁살뮄?? : '?維??낆쐣?굿?낆쐣?揶쎛鈺?}
                    {room.seed_mode && ' 夷??????λ리'}
                  </div>
                </div>
                <span style={styles.roomArrow}>??/span>
              </div>
            ))}
          </div>
        )}

        <button
          style={styles.addRoomBtn}
          onClick={() => router.push('/write')}
        >
          + 獄?筌띾슢諭얏묾?        </button>

        {/* 筌욌쵐竊?紐껋춸 癰귣똻????λ뜄? 甕곌쑵??*/}
        {isOwner && (
          <button
            style={styles.inviteBtn}
            onClick={handleInvite}
            disabled={inviteLoading}
          >
            {inviteLoading ? '??筌띻낱寃???밴쉐 餓?..' : '?逾???곸뜍 ?λ뜄???띾┛'}
          </button>
        )}
      </div>

      {showShare && inviteUrl && (
        <ShareModal
          url={inviteUrl}
          title={`${house.title} ?λ뜄?`}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '50vh', fontSize: 40,
  },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  backBtn: { fontSize: 20, color: '#2C1810', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: '#2C1810' },
  iconBtn: {
    width: 36, height: 36, borderRadius: '50%', background: '#F5F0E8',
    border: 'none', fontSize: 16, cursor: 'pointer',
  },
  cover: {
    height: 140,
    background: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
    display: 'flex', alignItems: 'flex-end', padding: '16px', gap: 12,
  },
  coverEmoji: { fontSize: 40 },
  coverTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 20, fontWeight: 600,
    color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  coverLang: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  coverDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  body: { padding: '16px' },
  sectionTitle: {
    fontSize: 11, color: '#9A8470', letterSpacing: '1px',
    textTransform: 'uppercase', marginBottom: 10,
  },
  emptyCard: {
    background: '#FEFCF8', borderRadius: 16,
    border: '1px dashed rgba(92,61,46,0.2)', padding: '32px 20px',
    textAlign: 'center', marginBottom: 12,
  },
  emptyText: { fontSize: 14, color: '#9A8470' },
  roomList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  roomCard: {
    background: '#FEFCF8', borderRadius: 14,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', boxShadow: '0 2px 12px rgba(44,24,16,0.06)',
  },
  roomIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: 'rgba(74,82,64,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: 500, color: '#1C1208' },
  roomMeta: { fontSize: 11, color: '#9A8470', marginTop: 3 },
  roomArrow: { fontSize: 16, color: '#9A8470' },
  addRoomBtn: {
    width: '100%', padding: '14px',
    background: '#FEFCF8', border: '1px dashed rgba(92,61,46,0.2)',
    borderRadius: 14, fontSize: 14, color: '#9A8470', cursor: 'pointer',
    marginBottom: 8,
  },
  inviteBtn: {
    width: '100%', padding: '14px',
    background: 'rgba(74,82,64,0.08)', border: '1px solid rgba(74,82,64,0.2)',
    borderRadius: 14, fontSize: 14, color: '#4A5240',
    fontWeight: 500, cursor: 'pointer',
  },
}