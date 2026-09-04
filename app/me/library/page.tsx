'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import FootprintRow from '@/components/blocks/FootprintRow'
import PostCompactRow from '@/components/blocks/PostCompactRow'
import { PostBlockData } from '@/components/blocks/PostBlock'

type Tab = 'footprints' | 'saved' | 'posts' | 'fruits'

export default function LibraryPage() {
  const [library, setLibrary] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('footprints')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const key = getDeviceId()
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
    { id: 'saved',      label: '🔖 관심',   count: (library?.saved_rooms?.length || 0) + (library?.saved_posts?.length || 0) },
    { id: 'posts',      label: '📝 내 글',  count: library?.my_posts?.length || 0 },
    { id: 'fruits',     label: '🍎 서재',   count: library?.harvested_fruits?.length || 0 },
  ]

  // messages(post/fruit) → PostBlockData 변환. 서재 감사(2026-09-04)로
  // PostCompactRow 연결 — 새 데이터 타입 안 만들고 기존 PostBlockData 그대로.
  const toPostBlockData = (m: any): PostBlockData => ({
    id: m.id,
    content: m.content,
    media: m.meta?.media,
    created_at: m.created_at,
  })

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>📚 서재</span>
        <div style={{ width: 36 }} />
      </div>

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

        {/* 발자취 탭 — FootprintRow. "어디를 방문했는가"만, 글 내용 없음
            (의도적 — 열람기록으로 바꾸지 않기로 확정, 2026-09-04). */}
        {activeTab === 'footprints' && (
          <div style={styles.list}>
            {(library?.footprints || []).length === 0 ? (
              <Empty emoji="👣" text="아직 방문한 곳이 없어요" />
            ) : (
              library.footprints.map((fp: any) => (
                <FootprintRow
                  key={fp.id}
                  footprint={{
                    id: fp.id,
                    house_name: fp.corenull_rooms?.corenull_houses?.title || null,
                    room_name: fp.corenull_rooms?.room_name || null,
                    visited_at: fp.visited_at,
                  }}
                  onClick={() => router.push(`/rooms/${fp.room_id}`)}
                />
              ))
            )}
          </div>
        )}

        {/* 관심 탭 — 방과 포스트가 섞여있어 맞는 기존 블록이 없음.
            블록화를 위한 블록화를 하지 않는다 — 인라인 유지(확정, 2026-09-04). */}
        {activeTab === 'saved' && (
          <div>
            {(library?.saved_rooms || []).length > 0 && (
              <>
                <div style={styles.subTitle}>관심 방</div>
                <div style={styles.list}>
                  {library.saved_rooms.map((b: any) => (
                    <div key={b.id} style={styles.listItem} onClick={() => router.push(`/rooms/${b.room_id}`)}>
                      <div style={styles.listIcon}>🏠</div>
                      <div style={styles.listInfo}>
                        <div style={styles.listTitle}>{b.corenull_rooms?.room_name || '방'}</div>
                        <div style={styles.listSub}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
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
                    <div key={b.id} style={styles.listItem} onClick={() => router.push(`/posts/${b.message_id}`)}>
                      <div style={styles.listIcon}>🔖</div>
                      <div style={styles.listInfo}>
                        <div style={styles.listTitle}>
                          {(b.messages?.content?.slice(0, 30) || '이야기')}{(b.messages?.content?.length || 0) > 30 ? '…' : ''}
                        </div>
                        <div style={styles.listSub}>{new Date(b.created_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                      <span style={styles.listArrow}>›</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {(library?.saved_rooms || []).length === 0 && (library?.saved_posts || []).length === 0 && (
              <Empty emoji="🔖" text="관심이 없어요" />
            )}
          </div>
        )}

        {/* 내 글 탭 — PostCompactRow. badges는 archived/reborn_from 있을 때만. */}
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

        {/* 서재(열매) 탭 — PostCompactRow. 수확일을 뱃지로. */}
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
    position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px',
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', zIndex: 99, backdropFilter: 'blur(12px)',
  },
  tab: {
    flex: 1, padding: '12px 4px', border: 'none', background: 'none',
    fontSize: 12, color: '#9A8470', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
    borderBottom: '2px solid transparent', transition: 'all 0.2s',
  },
  tabActive: { color: '#2C1810', fontWeight: 500, borderBottom: '2px solid #C17F3C' },
  tabCount: {
    fontSize: 11, color: '#C17F3C', fontWeight: 600,
    background: 'rgba(193,127,60,0.12)', padding: '1px 5px', borderRadius: 10,
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
}