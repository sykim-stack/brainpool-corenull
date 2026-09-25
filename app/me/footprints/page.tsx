'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
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
      <TopBar logo={<CoreNullLogo size="sm" />} title="발자취" />

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
  body: { padding: '16px' },
  empty: { textAlign: 'center', padding: '64px 24px' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
}
