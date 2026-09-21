'use client'

// 광장 = 마당의 넓은 Scope (공개 방 → 그 집 마당).
// 새 카드/레이아웃을 만들지 않고 RoomCard + rooms?scope=plaza 재사용.

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

  useEffect(() => {
    fetch('/api/corenull/rooms?scope=plaza&limit=40')
      .then((r) => r.json())
      .then((d) => {
        const list = d.data || []
        // 마당 발견과 같이: 최근 활동(글) 있는 방을 앞에, 없는 방은 뒤로
        const sorted = [...list].sort((a, b) => {
          const at = a.latest_message?.created_at
            ? new Date(a.latest_message.created_at).getTime()
            : 0
          const bt = b.latest_message?.created_at
            ? new Date(b.latest_message.created_at).getTime()
            : 0
          return bt - at
        })
        setRooms(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="광장"
        actions={[
          {
            key: 'home',
            emoji: '🏠',
            label: '나의 마당',
            onClick: () => router.push('/yard'),
          },
        ]}
      />

      <div style={styles.body}>
        {loading ? (
          <div style={styles.loading}>🏛️</div>
        ) : rooms.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏛️</div>
            <p style={{ fontSize: 14, color: '#9A8470' }}>아직 둘러볼 공개 방이 없어요</p>
          </div>
        ) : (
          <div style={styles.list}>
            {rooms.map((room: any) => (
              <RoomCard
                key={room.id}
                room={room}
                houseName={room.corenull_houses?.title || null}
                // 광장 → 그 집 마당 (사람/집을 먼저 만난다)
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
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    fontSize: 40,
  },
  empty: { textAlign: 'center', padding: '64px 24px' },
  body: { padding: '16px' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
}
