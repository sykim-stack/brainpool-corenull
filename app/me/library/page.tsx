'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import OwnerGate from '@/components/corenull/OwnerGate'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import FootprintHouseGroup, {
  groupFootprintsByHouse,
} from '@/components/blocks/FootprintHouseGroup'
import PostCompactRow from '@/components/blocks/PostCompactRow'
import { PostBlockData } from '@/components/blocks/PostBlock'

type Tab = 'footprints' | 'saved' | 'posts' | 'fruits'

export default function LibraryPage() {
  const [library, setLibrary] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('footprints')
  const [loading, setLoading] = useState(true)
  const [ownerKey, setOwnerKey] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key)
    setOwnerReady(true)
    if (!key) return
    fetch(`/api/corenull/library?owner_key=${key}`)
      .then((r) => r.json())
      .then((d) => {
        setLibrary(d.data)
        setLoading(false)
      })
  }, [])

  const footprintGroups = useMemo(
    () => groupFootprintsByHouse(library?.footprints || []),
    [library?.footprints]
  )

  if (!ownerReady) return null
  if (!ownerKey) return <OwnerGate />

  if (loading) return <div style={styles.loading}>📚</div>

  const tabs = [
    { id: 'footprints', label: '👣 발자취', count: footprintGroups.length },
    {
      id: 'saved',
      label: '🔖 관심',
      count: (library?.saved_rooms?.length || 0) + (library?.saved_posts?.length || 0),
    },
    { id: 'posts', label: '📝 내 글', count: library?.my_posts?.length || 0 },
    { id: 'fruits', label: '🍎 서재', count: library?.harvested_fruits?.length || 0 },
  ]

  const toPostBlockData = (m: any): PostBlockData => ({
    id: m.id,
    content: m.content,
    media: m.meta?.media,
    created_at: m.created_at,
  })

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="서재" />

      <div style={styles.tabRow}>
        {tabs.map((tab) => (
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
        {/* 발자취 — 집 묶음. 탭하면 방문 방 펼침 */}
        {activeTab === 'footprints' && (
          <div style={styles.list}>
            {footprintGroups.length === 0 ? (
              <Empty emoji="👣" text="아직 방문한 곳이 없어요" />
            ) : (
              footprintGroups.map((g) => (
                <FootprintHouseGroup
                  key={g.house_id || g.house_name || g.last_visited_at}
                  group={g}
                  onRoomClick={(roomId) => router.push(`/rooms/${roomId}`)}
                  onHouseClick={(houseId) => {
                    if (houseId) router.push(`/houses/${houseId}/living`)
                  }}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div>
            {(library?.saved_rooms || []).length > 0 && (
              <>
                <div style={styles.subTitle}>관심 방</div>
                <div style={styles.list}>
                  {library.saved_rooms.map((b: any) => (
                    <div
                      key={b.id}
                      style={styles.listItem}
                      onClick={() => router.push(`/rooms/${b.room_id}`)}
                    >
                      <div style={styles.listIcon}>🏠</div>
                      <div style={styles.listInfo}>
                        <div style={styles.listTitle}>{b.corenull_rooms?.room_name || '방'}</div>
                        <div style={styles.listSub}>
                          {new Date(b.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <span style={styles.listArrow}>›</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {(library?.saved_posts || []).length > 0 && (
              <>
                <div style={styles.subTitle}>관심 포스트</div>
                <div style={styles.list}>
                  {library.saved_posts.map((b: any) => (
                    <div
                      key={b.id}
                      style={styles.listItem}
                      onClick={() => router.push(`/posts/${b.message_id}`)}
                    >
                      <div style={styles.listIcon}>🔖</div>
                      <div style={styles.listInfo}>
                        <div style={styles.listTitle}>
                          {(b.messages?.content?.slice(0, 30) || '이야기')}
                          {(b.messages?.content?.length || 0) > 30 ? '…' : ''}
                        </div>
                        <div style={styles.listSub}>
                          {new Date(b.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <span style={styles.listArrow}>›</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {(library?.saved_rooms || []).length === 0 &&
              (library?.saved_posts || []).length === 0 && (
                <Empty emoji="🔖" text="관심이 없어요" />
              )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div style={styles.list}>
            {(library?.my_posts || []).length === 0 ? (
              <Empty emoji="📝" text="아직 쓴 이야기가 없어요" />
            ) : (
              library.my_posts.map((post: any) => (
                <PostCompactRow
                  key={post.id}
                  post={toPostBlockData(post)}
                  thumbnailUrl={post.meta?.media?.find((m: any) => m.type === 'image')?.url}
                  badges={[
                    ...(post.meta?.archived ? ['보관됨'] : []),
                    ...(post.meta?.reborn_from ? ['재탄생'] : []),
                  ]}
                  onClick={() => router.push(`/posts/${post.id}`)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'fruits' && (
          <div style={styles.list}>
            {(library?.harvested_fruits || []).length === 0 ? (
              <Empty emoji="🍎" text="아직 수확된 열매가 없어요" />
            ) : (
              library.harvested_fruits.map((fruit: any) => (
                <PostCompactRow
                  key={fruit.id}
                  post={toPostBlockData(fruit)}
                  thumbnailUrl={fruit.meta?.media?.find((m: any) => m.type === 'image')?.url}
                  badges={['🍎 열매']}
                  onClick={() => router.push(`/posts/${fruit.id}`)}
                />
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
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    fontSize: 40,
  },
  tabRow: {
    position: 'sticky',
    top: 0,
    width: '100%',
    background: 'rgba(254,252,248,0.95)',
    borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex',
    zIndex: 50,
    backdropFilter: 'blur(12px)',
  },
  tab: {
    flex: 1,
    padding: '12px 4px',
    border: 'none',
    background: 'none',
    fontSize: 12,
    color: '#9A8470',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#2C1810',
    fontWeight: 500,
    borderBottom: '2px solid #C17F3C',
  },
  tabCount: {
    fontSize: 11,
    color: '#C17F3C',
    fontWeight: 600,
    background: 'rgba(193,127,60,0.12)',
    padding: '1px 5px',
    borderRadius: 10,
  },
  body: { padding: '16px' },
  subTitle: {
    fontSize: 11,
    color: '#9A8470',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    padding: '8px 4px 6px',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: {
    background: '#FEFCF8',
    borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(74,82,64,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  listInfo: { flex: 1, minWidth: 0 },
  listTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1C1208',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listSub: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  listArrow: { fontSize: 16, color: '#9A8470' },
}
