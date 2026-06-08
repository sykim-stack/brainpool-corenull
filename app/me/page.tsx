'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const OWNER_KEY = 'test-device-001'

export default function MePage() {
  const [library, setLibrary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/corenull/library?owner_key=${OWNER_KEY}`)
      .then(r => r.json())
      .then(d => {
        setLibrary(d.data)
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={styles.loading}>👤</div>

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>나</span>
        <button style={styles.iconBtn}>⚙️</button>
      </div>

      <div style={styles.body}>
        {/* 프로필 */}
        <div style={styles.profileCard}>
          <div style={styles.profileAvatar}>🌱</div>
          <div>
            <div style={styles.profileName}>나의 공간</div>
            <div style={styles.profileDevice}>{OWNER_KEY}</div>
          </div>
        </div>

        {/* 활동 요약 */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{library?.my_posts?.length || 0}</span>
            <span style={styles.statLabel}>이야기</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{library?.footprints?.length || 0}</span>
            <span style={styles.statLabel}>발자취</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{(library?.saved_rooms?.length || 0) + (library?.saved_posts?.length || 0)}</span>
            <span style={styles.statLabel}>저장</span>
          </div>
        </div>

        {/* 메뉴 */}
        <div style={styles.menuSection}>
          <div style={styles.menuItem} onClick={() => router.push('/me/library')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(74,82,64,0.12)' }}>📚</div>
            <span style={styles.menuLabel}>서재</span>
            <span style={styles.menuBadge}>{
              (library?.footprints?.length || 0) +
              (library?.saved_rooms?.length || 0) +
              (library?.saved_posts?.length || 0)
            }</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={() => router.push('/me/posts')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>📝</div>
            <span style={styles.menuLabel}>내가 쓴 이야기</span>
            <span style={styles.menuBadge}>{library?.my_posts?.length || 0}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem}>
            <div style={{ ...styles.menuIcon, background: 'rgba(200,213,185,0.4)' }}>👣</div>
            <span style={styles.menuLabel}>발자취</span>
            <span style={styles.menuBadge}>{library?.footprints?.length || 0}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem}>
            <div style={{ ...styles.menuIcon, background: 'rgba(200,213,185,0.4)' }}>🔖</div>
            <span style={styles.menuLabel}>저장한 것들</span>
            <span style={styles.menuBadge}>{(library?.saved_rooms?.length || 0) + (library?.saved_posts?.length || 0)}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuItem}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>🏡</div>
            <span style={styles.menuLabel}>내 집 관리</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem}>
            <div style={{ ...styles.menuIcon, background: 'rgba(200,213,185,0.4)' }}>⚙️</div>
            <span style={styles.menuLabel}>설정</span>
            <span style={styles.menuArrow}>›</span>
          </div>
        </div>
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
    position: 'fixed', top: 0, left: 0,
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  headerTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: '50%', background: '#F5F0E8',
    border: 'none', fontSize: 16, cursor: 'pointer',
  },
  body: { padding: '16px' },
  profileCard: {
    background: '#FEFCF8', borderRadius: 20,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 12, boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg, #4A5240, #C17F3C)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
  },
  profileName: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810',
  },
  profileDevice: { fontSize: 11, color: '#9A8470', marginTop: 4 },
  statsRow: {
    background: '#FEFCF8', borderRadius: 16,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '16px', display: 'flex', alignItems: 'center',
    marginBottom: 12, boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
  },
  statItem: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  statNum: { fontSize: 22, fontWeight: 600, color: '#2C1810' },
  statLabel: { fontSize: 11, color: '#9A8470' },
  statDivider: { width: 1, height: 32, background: 'rgba(92,61,46,0.12)' },
  menuSection: {
    background: '#FEFCF8', borderRadius: 16,
    border: '1px solid rgba(92,61,46,0.12)',
    overflow: 'hidden', marginBottom: 12,
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderBottom: '1px solid rgba(92,61,46,0.08)',
    cursor: 'pointer',
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  menuLabel: { flex: 1, fontSize: 14, color: '#1C1208' },
  menuBadge: {
    fontSize: 12, color: '#9A8470', fontWeight: 500,
  },
  menuArrow: { fontSize: 16, color: '#9A8470' },
}