'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'

type NeighborRow = {
  id: string
  status: 'pending' | 'accepted'
  direction: 'outgoing' | 'incoming'
  requested_at: string
  responded_at: string | null
  house: { id: string; title: string; primary_language: string } | null
}

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

export default function MyNeighborsPage() {
  const router = useRouter()
  const [ownerKey, setOwnerKey] = useState('')
  const [myHouseId, setMyHouseId] = useState<string | null>(null)
  const [neighbors, setNeighbors] = useState<NeighborRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)

    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then(r => r.json())
      .then(async (d) => {
        const myHouse = d.data?.[0]
        if (!myHouse) {
          setLoading(false)
          return
        }
        setMyHouseId(myHouse.id)
        const nb = await fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`).then(r => r.json())
        setNeighbors(nb.data || [])
        setLoading(false)
      })
  }, [])

  const handleAccept = async (neighborId: string) => {
    if (actingId) return
    setActingId(neighborId)
    const res = await fetch('/api/corenull/houses?action=neighbor-accept', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighbor_id: neighborId, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data) {
      setNeighbors((prev) => prev.map((n) => n.id === neighborId ? { ...n, status: 'accepted' } : n))
    }
    setActingId(null)
  }

  // 거절 / 취소 / 해지 — 전부 DELETE 하나로 처리 (ADR-ACCESS-002 §3)
  const handleRemove = async (neighborId: string) => {
    if (actingId) return
    setActingId(neighborId)
    await fetch(`/api/corenull/houses?action=neighbor-remove&neighbor_id=${neighborId}&owner_key=${ownerKey}`, {
      method: 'DELETE',
    })
    setNeighbors((prev) => prev.filter((n) => n.id !== neighborId))
    setActingId(null)
  }

  if (loading) return <div style={styles.loading}>🏘️</div>

  const received = neighbors.filter((n) => n.status === 'pending' && n.direction === 'incoming')
  const sent = neighbors.filter((n) => n.status === 'pending' && n.direction === 'outgoing')
  const accepted = neighbors.filter((n) => n.status === 'accepted')

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>이웃</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.body}>
        {neighbors.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏘️</div>
            <p style={{ fontSize: 14, color: '#9A8470' }}>아직 이웃이 없어요</p>
          </div>
        ) : (
          <>
            {received.length > 0 && (
              <>
                <div style={styles.sectionTitle}>받은 요청</div>
                <div style={styles.list}>
                  {received.map((n) => (
                    <NeighborItem key={n.id} n={n} onClick={undefined}>
                      <button
                        style={{ ...styles.actionBtn, ...styles.acceptBtn }}
                        onClick={(e) => { e.stopPropagation(); handleAccept(n.id) }}
                        disabled={actingId === n.id}
                      >수락</button>
                      <button
                        style={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); handleRemove(n.id) }}
                        disabled={actingId === n.id}
                      >거절</button>
                    </NeighborItem>
                  ))}
                </div>
              </>
            )}

            {sent.length > 0 && (
              <>
                <div style={styles.sectionTitle}>보낸 요청</div>
                <div style={styles.list}>
                  {sent.map((n) => (
                    <NeighborItem key={n.id} n={n} onClick={undefined}>
                      <button
                        style={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); handleRemove(n.id) }}
                        disabled={actingId === n.id}
                      >취소</button>
                    </NeighborItem>
                  ))}
                </div>
              </>
            )}

            {accepted.length > 0 && (
              <>
                <div style={styles.sectionTitle}>이웃</div>
                <div style={styles.list}>
                  {accepted.map((n) => (
                    <NeighborItem
                      key={n.id}
                      n={n}
                      onClick={() => n.house && router.push(`/houses/${n.house.id}/yard`)}
                    >
                      <button
                        style={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); handleRemove(n.id) }}
                        disabled={actingId === n.id}
                      >해지</button>
                    </NeighborItem>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function NeighborItem({ n, onClick, children }: { n: NeighborRow; onClick?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ ...styles.item, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={styles.icon}>{n.house ? (LANG_FLAG[n.house.primary_language] || '🏡') : '🏡'}</div>
      <div style={styles.info}>
        <div style={styles.itemTitle}>{n.house?.title || '알 수 없는 집'}</div>
        <div style={styles.date}>{new Date(n.requested_at).toLocaleDateString('ko-KR')}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>{children}</div>
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
  sectionTitle: {
    fontSize: 12, color: '#5C4A35', fontWeight: 600,
    padding: '8px 4px 6px', marginBottom: 6,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  item: {
    background: '#FEFCF8', borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
  },
  icon: { width: 40, height: 40, borderRadius: 10, background: 'rgba(74,82,64,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  info: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13, fontWeight: 500, color: '#1C1208', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  actionBtn: {
    fontSize: 11, color: '#9A8470', background: 'none', border: '1px solid rgba(92,61,46,0.2)',
    borderRadius: 10, padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
  },
  acceptBtn: { color: '#4A5240', border: '1px solid rgba(74,82,64,0.3)' },
}