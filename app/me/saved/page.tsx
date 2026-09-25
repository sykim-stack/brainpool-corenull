'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'

type Bookmark = {
  id: string
  room_id: string | null
  message_id: string | null
  created_at: string
  ended_at: string | null
  corenull_rooms: { id: string; room_name: string } | null
  messages: { id: string; content: string } | null
}

export default function SavedPage() {
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [ownerKey, setOwnerKey] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    fetch(`/api/corenull/bookmarks?owner_key=${key}`)
      .then(r => r.json())
      .then(d => {
        setBookmarks(d.data || [])
        setLoading(false)
      })
  }, [])

  const handleToggle = async (e: any, b: Bookmark) => {
    e.stopPropagation()
    const action = b.ended_at ? 'resume' : 'end'
    const res = await fetch('/api/corenull/bookmarks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, owner_key: ownerKey, action }),
    })
    const data = await res.json()
    if (data.data) {
      setBookmarks(prev => prev.map(bm => bm.id === b.id ? { ...bm, ended_at: data.data.ended_at } : bm))
    }
  }

  if (loading) return <div style={styles.loading}>◉</div>

  const activeRooms = bookmarks.filter(b => b.room_id && !b.message_id && !b.ended_at)
  const activePosts = bookmarks.filter(b => b.message_id && !b.room_id && !b.ended_at)
  const endedAll = bookmarks.filter(b => b.ended_at)

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="관심" />

      <div style={styles.body}>
        {bookmarks.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>○</div>
            <p style={{ fontSize: 14, color: '#9A8470' }}>관심 항목이 없어요</p>
          </div>
        ) : (
          <>
            {(activeRooms.length > 0 || activePosts.length > 0) && (
              <>
                <div style={styles.sectionTitle}>◉ 관심중</div>
                <div style={styles.list}>
                  {activeRooms.map(b => (
                    <div key={b.id} style={styles.item} onClick={() => router.push(`/rooms/${b.room_id}`)}>
                      <div style={styles.icon}>🏠</div>
                      <div style={styles.info}>
                        <div style={styles.itemTitle}>{b.corenull_rooms?.room_name || '방'}</div>
                        <div style={styles.date}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                      <button style={styles.toggleBtn} onClick={e => handleToggle(e, b)}>종료</button>
                    </div>
                  ))}
                  {activePosts.map(b => (
                    <div key={b.id} style={styles.item} onClick={() => router.push(`/posts/${b.message_id}`)}>
                      <div style={styles.icon}>◉</div>
                      <div style={styles.info}>
                        <div style={styles.itemTitle}>{b.messages?.content?.slice(0, 40) || '이야기'}</div>
                        <div style={styles.date}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                      <button style={styles.toggleBtn} onClick={e => handleToggle(e, b)}>종료</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {endedAll.length > 0 && (
              <>
                <div style={styles.sectionTitle}>○ 관심종료</div>
                <div style={styles.list}>
                  {endedAll.map(b => (
                    <div key={b.id} style={{ ...styles.item, opacity: 0.5 }}
                      onClick={() => b.message_id ? router.push(`/posts/${b.message_id}`) : router.push(`/rooms/${b.room_id}`)}>
                      <div style={styles.icon}>{b.message_id ? '○' : '🏠'}</div>
                      <div style={styles.info}>
                        <div style={styles.itemTitle}>
                          {b.message_id ? (b.messages?.content?.slice(0, 40) || '이야기') : (b.corenull_rooms?.room_name || '방')}
                        </div>
                        <div style={styles.date}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                      <button style={{ ...styles.toggleBtn, color: '#4A5240' }} onClick={e => handleToggle(e, b)}>복구</button>
                    </div>
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

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
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
    cursor: 'pointer',
  },
  icon: { width: 40, height: 40, borderRadius: 10, background: 'rgba(74,82,64,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  info: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13, fontWeight: 500, color: '#1C1208', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  toggleBtn: {
    fontSize: 11, color: '#C17F3C', background: 'none', border: '1px solid rgba(193,127,60,0.3)',
    borderRadius: 10, padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
  },
}
