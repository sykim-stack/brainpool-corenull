'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const OWNER_KEY = 'test-device-001'

export default function HomePage() {
  const router = useRouter()  // ← 여기로 이동
  const [houses, setHouses] = useState([])
  const [footprints, setFootprints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/corenull/houses?owner_key=${OWNER_KEY}`).then(r => r.json()),
      fetch(`/api/corenull/footprints?owner_key=${OWNER_KEY}`).then(r => r.json()),
    ]).then(([h, f]) => {
      setHouses(h.data || [])
      setFootprints(f.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={styles.loading}>🏡</div>

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <span style={styles.logo}>Core<span style={{ color: '#C17F3C' }}>Null</span></span>
        <button style={styles.iconBtn}>🔍</button>
      </div>

      {/* 내 집 */}
      <div style={styles.sectionTitle}>내 집</div>

      {houses.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏡</div>
          <div style={styles.emptyText}>아직 집이 없어요</div>
          <button style={styles.createBtn} onClick={() => router.push('/houses/create')}>
                  집 만들기
          </button>
        </div>
      ) : (
        houses.map((house: any) => (
        <div key={house.id} style={styles.houseCard} onClick={() => router.push(`/houses/${house.id}`)}>
          <div style={styles.houseCover}>
              <span style={{ fontSize: 32 }}>🏡</span>
              <div>
                <div style={styles.houseName}>{house.title}</div>
                <div style={styles.houseLang}>
                  {house.primary_language === 'ko' ? '🇰🇷' : house.primary_language === 'vi' ? '🇻🇳' : '🌐'} {house.primary_language}
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {/* 최근 방문 */}
      {footprints.length > 0 && (
        <>
          <div style={styles.sectionTitle}>최근 방문</div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {footprints.slice(0, 5).map((fp: any) => (
              <div key={fp.id} style={styles.visitItem}>
                <div style={styles.visitIcon}>👣</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.visitRoom}>{fp.room_id}</div>
                  <div style={styles.visitTime}>{new Date(fp.visited_at).toLocaleDateString('ko-KR')}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  logo: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: '50%', background: '#F5F0E8',
    border: 'none', fontSize: 16, cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: 11, color: '#9A8470', letterSpacing: '1px',
    textTransform: 'uppercase', padding: '20px 20px 10px',
  },
  houseCard: {
    margin: '0 16px 12px', background: '#FEFCF8',
    borderRadius: 16, border: '1px solid rgba(92,61,46,0.12)',
    overflow: 'hidden', boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
  },
  houseCover: {
    height: 100, background: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
    display: 'flex', alignItems: 'flex-end', padding: '14px 16px', gap: 10,
  },
  houseName: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600,
    color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  houseLang: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  emptyCard: {
    margin: '0 16px', background: '#FEFCF8', borderRadius: 16,
    border: '1px dashed rgba(92,61,46,0.2)', padding: '32px 20px',
    textAlign: 'center',
  },
  emptyText: { fontSize: 14, color: '#9A8470', marginBottom: 16 },
  createBtn: {
    padding: '10px 24px', background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer',
  },
  visitItem: {
    background: '#FEFCF8', borderRadius: 12, border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
  },
  visitIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg, #7A8C6E, #C8D5B9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  visitRoom: { fontSize: 13, color: '#1C1208', fontWeight: 500 },
  visitTime: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '50vh', fontSize: 40,
  },
}