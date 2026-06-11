'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

const OWNER_KEY = 'test-device-001'

export default function HouseDetailPage() {
  const { houseId } = useParams()
  const router = useRouter()
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

  if (loading) return <div style={styles.loading}>🏡</div>
  if (!house) return <div style={styles.loading}>집을 찾을 수 없어요</div>

  const langFlag = house.primary_language === 'ko' ? '🇰🇷'
    : house.primary_language === 'vi' ? '🇻🇳'
    : house.primary_language === 'en' ? '🇺🇸'
    : house.primary_language === 'ja' ? '🇯🇵'
    : house.primary_language === 'zh' ? '🇨🇳' : '🌐'

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>{house.title}</span>
        <button style={styles.iconBtn}>⚙️</button>
      </div>

      {/* 집 커버 */}
      <div style={styles.cover}>
        <div style={styles.coverEmoji}>🏡</div>
        <div>
          <div style={styles.coverTitle}>{house.title}</div>
          <div style={styles.coverLang}>{langFlag} {house.primary_language}</div>
          {house.description && (
            <div style={styles.coverDesc}>{house.description}</div>
          )}
        </div>
      </div>

      <div style={styles.body}>
        {/* 방 목록 */}
        <div style={styles.sectionTitle}>방</div>

        {rooms.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚪</div>
            <div style={styles.emptyText}>아직 방이 없어요</div>
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
                  {room.event_mode ? '🌱' : '🚪'}
                </div>
                <div style={styles.roomInfo}>
                  <div style={styles.roomName}>{room.room_name}</div>
                  <div style={styles.roomMeta}>
                    {room.visibility === 'public' ? '🌍 공개' : room.visibility === 'friend' ? '👥 친구' : '👨‍👩‍👧 가족'}
                    {room.event_mode && ' · 🌱 씨앗'}
                  </div>
                </div>
                <span style={styles.roomArrow}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* 방 만들기 버튼 */}
        <button
          style={styles.addRoomBtn}
          onClick={() => router.push('/write')}
        >
          + 방 만들기
        </button>
      </div>
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
  },
}