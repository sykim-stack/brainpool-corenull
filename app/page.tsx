'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

const COREHUB_URL = 'https://brainpool-corehub.vercel.app/api/corehub/opportunities'

const ACTION_LABEL: Record<string, string> = {
  'trigger.hajunai.nudge':     '🌱 씨앗이 기다리고 있어요',
  'trigger.hajunai.celebrate': '🍎 씨앗이 열매가 됐어요',
  'suggest.corering':          '💬 번역 도움이 필요하신가요?',
}

export default function HomePage() {
  const router = useRouter()
  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [footprints, setFootprints] = useState<any[]>([])
  const [discoveries, setDiscoveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getDeviceId()
    if (!key) return
    setOwnerKey(key)

    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then(r => r.json())
      .then(async (d) => {
        // 1인 1집 — owner당 house는 항상 0개 또는 1개
        const myHouse = (d.data || [])[0] || null
        setHouse(myHouse)

        if (myHouse) {
          const [rRes, fRes] = await Promise.all([
            fetch(`/api/corenull/rooms?house_id=${myHouse.id}`).then(r => r.json()),
            fetch(`/api/corenull/footprints?owner_key=${key}`).then(r => r.json()),
          ])
          setRooms(rRes.data || [])
          setFootprints(fRes.data || [])

          fetch(`${COREHUB_URL}?owner_key=${key}`)
            .then(r => r.json())
            .then(dd => setDiscoveries((Array.isArray(dd.data) ? dd.data : []).slice(0, 3)))
            .catch(() => null)
        }

        setLoading(false)
      })
  }, [])

  const handleDiscoveryDismiss = async (opportunityId: string) => {
    setDiscoveries(prev => prev.filter(d => d.id !== opportunityId))
    fetch(COREHUB_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opportunityId, outcome: 'shown' }),
    }).catch(() => null)
  }

  if (loading) return <div style={styles.loading}>🏡</div>

  // 아직 집이 없는 신규 사용자 — 최초 1회만 집 만들기 온보딩
  if (!house) {
    return (
      <div>
        <div style={styles.header}>
          <span style={styles.logo}>Core<span style={{ color: '#C17F3C' }}>Null</span></span>
        </div>
        <div style={styles.body}>
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏡</div>
            <div style={styles.emptyText}>아직 집이 없어요</div>
            <button style={styles.createBtn} onClick={() => router.push('/houses/create')}>
              집 만들기
            </button>
          </div>
        </div>
      </div>
    )
  }

  const langFlag = LANG_FLAG[house.primary_language] || '🌐'

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <span style={styles.logo}>Core<span style={{ color: '#C17F3C' }}>Null</span></span>
        <button style={styles.iconBtn} onClick={() => router.push(`/houses/${house.id}`)}>⚙️</button>
      </div>

      {/* 집 커버 — 간단히, 방 목록이 메인이므로 얇게 유지 */}
      <div style={styles.cover}>
        <span style={{ fontSize: 32 }}>🏡</span>
        <div>
          <div style={styles.coverTitle}>{house.title}</div>
          <div style={styles.coverLang}>{langFlag} {house.primary_language}</div>
        </div>
      </div>

      <div style={styles.body}>
        {/* 오늘의 발견 */}
        {discoveries.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={styles.sectionTitle}>✨ 오늘의 발견</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {discoveries.map((d: any) => {
                const label = ACTION_LABEL[d.action_type] || d.payload?.message || '새로운 연결을 발견했어요'
                return (
                  <div key={d.id} style={styles.discoveryCard}>
                    <span style={styles.discoveryText}>{label}</span>
                    <button style={styles.discoveryDismiss} onClick={() => handleDiscoveryDismiss(d.id)}>✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 방 목록 — 홈의 메인 콘텐츠 */}
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
                <div style={styles.roomIcon}>{room.seed_mode ? '🌱' : '🚪'}</div>
                <div style={styles.roomInfo}>
                  <div style={styles.roomName}>{room.room_name}</div>
                  <div style={styles.roomMeta}>
                    {room.visibility === 'public' ? '🌍 공개' : room.visibility === 'invite' ? '👥 이웃공개' : '👨‍👩‍👧 가족'}
                    {room.seed_mode && ' · 🌱 씨앗'}
                  </div>
                </div>
                <span style={styles.roomArrow}>›</span>
              </div>
            ))}
          </div>
        )}

        <button style={styles.addRoomBtn} onClick={() => router.push('/write')}>
          + 방 만들기
        </button>

        {/* 최근 방문 */}
        {footprints.length > 0 && (
          <>
            <div style={{ ...styles.sectionTitle, marginTop: 24 }}>최근 방문</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {footprints.slice(0, 5).map((fp: any) => (
                <div
                  key={fp.id}
                  style={styles.visitItem}
                  onClick={() => router.push(`/rooms/${fp.room_id}`)}
                >
                  <div style={styles.visitIcon}>👣</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.visitRoom}>
                      {fp.corenull_rooms?.room_name || '방'}
                    </div>
                    <div style={styles.visitTime}>
                      {new Date(fp.visited_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <span style={{ fontSize: 16, color: '#9A8470' }}>›</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  logo: { fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810' },
  iconBtn: { width: 36, height: 36, borderRadius: '50%', background: '#F5F0E8', border: 'none', fontSize: 16, cursor: 'pointer' },
  cover: {
    marginTop: 56, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
  },
  coverTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600,
    color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  coverLang: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  body: { padding: '16px' },
  sectionTitle: {
    fontSize: 11, color: '#9A8470', letterSpacing: '1px',
    textTransform: 'uppercase', marginBottom: 10,
  },
  discoveryCard: {
    background: 'linear-gradient(135deg, rgba(193,127,60,0.08), rgba(74,82,64,0.06))',
    border: '1px solid rgba(193,127,60,0.2)',
    borderRadius: 12, padding: '12px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  discoveryText: { fontSize: 13, color: '#2C1810', lineHeight: 1.5, flex: 1 },
  discoveryDismiss: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: '#9A8470', padding: '0 0 0 8px', flexShrink: 0,
  },
  emptyCard: {
    background: '#FEFCF8', borderRadius: 16,
    border: '1px dashed rgba(92,61,46,0.2)', padding: '32px 20px',
    textAlign: 'center', marginBottom: 12,
  },
  emptyText: { fontSize: 14, color: '#9A8470', marginBottom: 16 },
  createBtn: {
    padding: '10px 24px', background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer',
  },
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
  visitItem: {
    background: '#FEFCF8', borderRadius: 12, border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 8,
  },
  visitIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg, #7A8C6E, #C8D5B9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  visitRoom: { fontSize: 13, color: '#1C1208', fontWeight: 500 },
  visitTime: { fontSize: 11, color: '#9A8470', marginTop: 2 },
}