'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import RoomCard from '@/components/corenull/RoomCard'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'

export default function PlazaPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myHouseId, setMyHouseId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/corenull/rooms?scope=plaza')
      .then(r => r.json())
      .then(d => {
        setRooms(d.data || [])
        setLoading(false)
      })

    // TopBar 🏠 목적지 — 나머지 화면들과 동일한 패턴, 항상 나의 마당 고정.
    const key = getDeviceId()
    if (key) {
      fetch(`/api/corenull/houses?owner_key=${key}`)
        .then(r => r.json())
        .then(d => setMyHouseId(d.data?.[0]?.id || null))
    }
  }, [])

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="광장"
        actions={myHouseId ? [
          { key: 'home', emoji: '🏠', label: '나의 마당', onClick: () => router.push(`/houses/${myHouseId}/yard`) },
        ] : []}
      />

      <div style={styles.body}>
        {loading ? (
          <div style={styles.loading}>🏛️</div>
        ) : rooms.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏛️</div>
            <p style={{ fontSize: 14, color: '#9A8470' }}>아직 발견할 공개 방이 없어요</p>
          </div>
        ) : (
          <div style={styles.list}>
            {rooms.map((room: any) => (
              <RoomCard
                key={room.id}
                room={room}
                // Master View §2/§3: 광장에서만 Room이 아니라 House로 점프한다
                // (사람을 먼저 만나고, 그다음 그 사람의 공간을 둘러본다).
                onClick={() => router.push(`/houses/${room.house_id}/yard`)}
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
  empty: { textAlign: 'center', padding: '64px 24px' },
  body: { padding: '16px' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
}