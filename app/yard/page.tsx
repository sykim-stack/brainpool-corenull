'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import RoomCard from '@/components/corenull/RoomCard'

type FilterKey = 'all' | 'neighbor' | 'recommend' | 'seed'

const FILTERS: { key: FilterKey; label: string; enabled: boolean }[] = [
  { key: 'all', label: '전체', enabled: true },
  { key: 'seed', label: '🌱 씨앗', enabled: true },
  { key: 'neighbor', label: '이웃', enabled: false },
  { key: 'recommend', label: '추천', enabled: false },
]

export default function YardPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    fetch('/api/corenull/yard')
      .then((r) => r.json())
      .then((d) => {
        setRooms(d.data || [])
        setLoading(false)
      })
  }, [])

  const visibleRooms = useMemo(() => {
    if (filter === 'seed') return rooms.filter((r) => !!r.stage?.seed_started_at)
    // neighbor/recommend는 아직 비활성 — 눌러도 여기까지 안 옴 (버튼 disabled)
    return rooms
  }, [rooms, filter])

  if (loading) {
    return (
      <div style={styles.loading}>🌳</div>
    )
  }

  return (
    <div>
      <div style={styles.header}>
        <span style={styles.headerTitle}>🌳 마당</span>
        <button style={styles.iconBtn} aria-label="검색">🔍</button>
      </div>

      <div style={styles.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => f.enabled && setFilter(f.key)}
            disabled={!f.enabled}
            style={{
              ...styles.chip,
              ...(filter === f.key ? styles.chipActive : {}),
              ...(!f.enabled ? styles.chipDisabled : {}),
            }}
          >
            {f.label}{!f.enabled ? ' · 곧' : ''}
          </button>
        ))}
      </div>

      <div style={styles.feed}>
        {visibleRooms.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p style={{ fontSize: 14, color: '#9A8470', lineHeight: 1.6 }}>
              {filter === 'seed' ? '자라는 씨앗이 아직 없어요' : '아직 이야기가 없어요.\n첫 이야기를 남겨보세요.'}
            </p>
          </div>
        ) : (
          visibleRooms.map((room) => (
            <div key={room.id} style={styles.cardWrap}>
              <RoomCard room={room} onClick={() => router.push(`/rooms/${room.id}`)} />
              <div style={styles.cardFooter}>
                <span style={styles.houseTag}>
                  {room.house_language === 'ko' ? '🇰🇷' : room.house_language === 'vi' ? '🇻🇳'
                    : room.house_language === 'en' ? '🇺🇸' : room.house_language === 'ja' ? '🇯🇵'
                    : room.house_language === 'zh' ? '🇨🇳' : '🏡'} {room.house_title || '집'}
                </span>
              </div>
            </div>
          ))
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
  headerTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810' },
  iconBtn: {
    width: 34, height: 34, borderRadius: '50%', background: '#F5F0E8',
    border: 'none', fontSize: 14, cursor: 'pointer',
  },
  filterRow: {
    position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px',
    display: 'flex', gap: 8, padding: '10px 20px',
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.08)',
    zIndex: 99, backdropFilter: 'blur(12px)',
  },
  chip: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    padding: '6px 12px', borderRadius: 20,
    border: '1px solid rgba(92,61,46,0.15)', background: 'none',
    color: '#5C4A35', cursor: 'pointer',
  },
  chipActive: { background: '#2C1810', color: '#FBF8F2', borderColor: '#2C1810' },
  chipDisabled: { opacity: 0.4, cursor: 'default' },
  feed: { padding: '112px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  empty: { textAlign: 'center', padding: '48px 24px' },
  cardWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  cardFooter: { padding: '0 2px' },
  houseTag: {
    fontSize: 11, color: '#9A8470',
  },
}