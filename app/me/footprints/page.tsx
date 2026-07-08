'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'

type Footprint = {
  id: string
  room_id: string
  visited_at: string
  corenull_rooms: { id: string; room_name: string } | null
}

export default function FootprintsPage() {
  const router = useRouter()
  const [footprints, setFootprints] = useState<Footprint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getDeviceId()
    fetch(`/api/corenull/footprints?owner_key=${key}`)
      .then(r => r.json())
      .then(d => {
        setFootprints(d.data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={styles.loading}>👣</div>

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>발자취</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.body}>
        {footprints.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👣</div>
            <p style={{ fontSize: 14, color: '#9A8470' }}>아직 방문한 곳이 없어요</p>
          </div>
        ) : (
          <div style={styles.list}>
            {footprints.map(fp => (
              <div
                key={fp.id}
                style={styles.item}
                onClick={() => router.push(`/rooms/${fp.room_id}`)}
              >
                <div style={styles.icon}>👣</div>
                <div style={styles.info}>
                  <div style={styles.roomName}>
                    {fp.corenull_rooms?.room_name || fp.room_id}
                  </div>
                  <div style={styles.date}>{formatDate(fp.visited_at)}</div>
                </div>
                <span style={styles.arrow}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  backBtn: { fontSize: 20, color: '#2C1810', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: '#2C1810' },
  body: { padding: '16px' },
  empty: { textAlign: 'center', padding: '64px 24px' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  item: {
    background: '#FEFCF8', borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer',
  },
  icon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'rgba(74,82,64,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  info: { flex: 1, minWidth: 0 },
  roomName: { fontSize: 13, fontWeight: 500, color: '#1C1208', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  arrow: { fontSize: 16, color: '#9A8470' },
}