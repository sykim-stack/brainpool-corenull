'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import FootprintRow, { FootprintData } from '@/components/blocks/FootprintRow'

export default function FootprintsPage() {
  const router = useRouter()
  const [footprints, setFootprints] = useState<FootprintData[]>([])
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
            {footprints.map((fp: any) => (
              <FootprintRow
                key={fp.id}
                footprint={fp}
                onClick={() => router.push(`/rooms/${fp.room_id}`)}
              />
            ))}
          </div>
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
    padding: '0 16px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  backBtn: { fontSize: 20, color: '#2C1810', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: '#2C1810' },
  body: { padding: '16px' },
  empty: { textAlign: 'center', padding: '64px 24px' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
}