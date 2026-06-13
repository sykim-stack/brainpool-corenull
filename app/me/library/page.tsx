'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'


type Tab = 'footprints' | 'saved' | 'posts'

export default function LibraryPage() {
  const [library, setLibrary] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('footprints')
  const [ownerKey, setOwnerKey] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    fetch(`/api/corenull/library?owner_key=${key}`)
      .then(r => r.json())
      .then(d => {
        setLibrary(d.data)
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={styles.loading}>📚</div>

  const tabs = [
    { id: 'footprints', label: '👣 발자취', count: library?.footprints?.length || 0 },
    { id: 'saved', label: '🔖 저장', count: (library?.saved_rooms?.length || 0) + (library?.saved_posts?.length || 0) },
    { id: 'posts', label: '📝 내 글', count: library?.my_posts?.length || 0 },
  ]

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>📚 서재</span>
        <div style={{ width: 36 }} />
      </div>

      {/* 탭 */}
      <div style={styles.tabRow}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab.id as Tab)}
          >
            {tab.label}
            {tab.count > 0 && <span style={styles.tabCount}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div style={styles.body}>
        {/* 발자취 탭 */}
        {activeTab === 'footprints' && (
          <div style={styles.list}>
            {(library?.footprints || []).length === 0 ? (
              <Empty emoji="👣" text="아직 방문한 곳이 없어요" />
            ) : (
              library.footprints.map((fp: any) => (
                <div key={fp.id} style={styles.listItem} onClick={() => router.push(`/rooms/${fp.room_id}`)}>
                  <div style={styles.listIcon}>👣</div>
                  <div style={styles.listInfo}>
                    <div style={styles.listTitle}>{fp.corenull_rooms?.room_name || fp.room_id}</div>
                    <div style={styles.listSub}>{new Date(fp.visited_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <span style={styles.listArrow}>›</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 저장 탭 */}
        {activeTab === 'saved' && (
          <div>
            {(library?.saved_rooms || []).length > 0 && (
              <>
                <div style={styles.subTitle}>저장한 방</div>
                <div style={styles.list}>
                  {library.saved_rooms.map((b: any) => (
                    <div key={b.id} style={styles.listItem}>
                      <div style={styles.listIcon}>🏠</div>
                      <div style={styles.listInfo}>
                        <div style={styles.listTitle}>{b.room_id}</div>
                        <div style={styles.listSub}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {(library?.saved_posts || []).length > 0 && (
              <>
                <div style={styles.subTitle}>저장한 포스트</div>
                <div style={styles.list}>
                  {library.saved_posts.map((b: any) => (
                    <div key={b.id} style={styles.listItem} onClick={() => router.push(`/posts/${b.message_id}`)}>
                      <div style={styles.listIcon}>🔖</div>
                      <div style={styles.listInfo}>
                        <div style={styles.listTitle}>저장한 이야기</div>
                        <div style={styles.listSub}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                      <span style={styles.listArrow}>›</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {(library?.saved_rooms || []).length === 0 && (library?.saved_posts || []).length === 0 && (
              <Empty emoji="🔖" text="저장한 것이 없어요" />
            )}
          </div>
        )}

        {/* 내 글 탭 */}
        {activeTab === 'posts' && (
          <div style={styles.list}>
            {(library?.my_posts || []).length === 0 ? (
              <Empty emoji="📝" text="아직 쓴 이야기가 없어요" />
            ) : (
              library.my_posts.map((post: any) => (
                <div key={post.id} style={styles.postItem} onClick={() => router.push(`/posts/${post.id}`)}>
                  {post.meta?.media?.[0]?.type === 'image' && (
                    <img src={post.meta.media[0].url} alt="" style={styles.postThumb} />
                  )}
                  <div style={styles.postInfo}>
                    <div style={styles.postContent}>
                      {post.content?.slice(0, 60)}{post.content?.length > 60 ? '...' : ''}
                    </div>
                    <div style={styles.postMeta}>
                      {post.meta?.archived && <span style={styles.archivedBadge}>보관됨</span>}
                      {post.meta?.reborn_from && <span style={styles.rebornBadge}>재탄생</span>}
                      <span style={styles.listSub}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  <span style={styles.listArrow}>›</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <p style={{ fontSize: 14, color: '#9A8470', lineHeight: 1.6 }}>{text}</p>
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
  tabRow: {
    position: 'fixed', top: 56, left: 0, width: '100%', maxWidth: '430px',
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', zIndex: 99, backdropFilter: 'blur(12px)',
  },
  tab: {
    flex: 1, padding: '12px 8px', border: 'none', background: 'none',
    fontSize: 13, color: '#9A8470', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderBottom: '2px solid transparent', transition: 'all 0.2s',
  },
  tabActive: { color: '#2C1810', fontWeight: 500, borderBottom: '2px solid #C17F3C' },
  tabCount: {
    fontSize: 11, color: '#C17F3C', fontWeight: 600,
    background: 'rgba(193,127,60,0.12)', padding: '1px 6px', borderRadius: 10,
  },
  body: { padding: '16px', marginTop: '40px' },
  subTitle: { fontSize: 11, color: '#9A8470', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '8px 4px 6px' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: {
    background: '#FEFCF8', borderRadius: 12, border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
  },
  listIcon: {
    width: 40, height: 40, borderRadius: 10, background: 'rgba(74,82,64,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  listInfo: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 13, fontWeight: 500, color: '#1C1208', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  listSub: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  listArrow: { fontSize: 16, color: '#9A8470' },
  postItem: {
    background: '#FEFCF8', borderRadius: 12, border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 8,
  },
  postThumb: { width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  postInfo: { flex: 1, minWidth: 0 },
  postContent: { fontSize: 13, color: '#1C1208', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box' },
  postMeta: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 },
  archivedBadge: { fontSize: 10, color: '#9A8470', background: 'rgba(92,61,46,0.08)', padding: '2px 6px', borderRadius: 6 },
  rebornBadge: { fontSize: 10, color: '#C17F3C', background: 'rgba(193,127,60,0.1)', padding: '2px 6px', borderRadius: 6 },
}