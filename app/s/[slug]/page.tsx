'use client'

// 씨드 배포 페이지 (초대장)
// /s/[slug] — 로그인 없이 열림
// PC: 넓은 레이아웃 + 블록(3-2-3) / 리스트 토글 (거실과 동일 감각)
// 모바일: 기존처럼 컴팩트

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import MyContentBlock from '@/components/blocks/MyContentBlock'
import PostBlock from '@/components/blocks/PostBlock'

type SeedPost = {
  id: string
  content: string
  created_at: string
  meta?: {
    media?: { type?: string; url?: string }[]
    seed?: { role?: string; phase?: string }
  }
}

type PageData = {
  page: {
    slug: string
    title: string | null
    memo: string
    end_date: string | null
    status: 'open' | 'fruit' | 'released'
    created_at: string
  }
  posts: SeedPost[]
  room_name: string | null
  house_title: string | null
  share_path: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '초대 중',
  fruit: '열매 · 완성',
  released: '종료됨',
}

export default function SeedSharePage() {
  const params = useParams()
  const slug = params?.slug as string
  const [data, setData] = useState<PageData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'block'>('block')

  useEffect(() => {
    if (!slug) return
    fetch(`/api/corenull/seed-pages?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d._error || !d.data) {
          setError(
            d._error === 'not_found'
              ? '초대장을 찾을 수 없어요.'
              : d._error || '불러오지 못했어요.',
          )
        } else {
          setData(d.data)
        }
      })
      .catch(() => setError('불러오지 못했어요.'))
      .finally(() => setLoading(false))
  }, [slug])

  const blockPosts = useMemo(() => {
    if (!data) return []
    return data.posts.map((p) => ({
      id: p.id,
      content: p.content || '',
      media: (p.meta?.media as any) || undefined,
      created_at: p.created_at,
      comment_count: 0,
      room_id: undefined,
      view_meta: {
        house_name: data.house_title || undefined,
        room_name: data.room_name || data.page.title || undefined,
      },
    }))
  }, [data])

  if (loading) {
    return (
      <div style={styles.wrap}>
        <p style={styles.muted}>불러오는 중…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={styles.wrap}>
        <p style={styles.error}>{error || '없어요'}</p>
      </div>
    )
  }

  const { page, house_title, room_name } = data
  const title = page.title || room_name || '초대장'

  return (
    <div style={styles.wrap}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.badge}>
            {page.status === 'fruit' ? '🍎' : page.status === 'open' ? '🌱' : '·'}{' '}
            {STATUS_LABEL[page.status] || page.status}
          </div>
          {house_title && <div style={styles.house}>{house_title}</div>}
          <h1 style={styles.title}>{title}</h1>
          {page.end_date && (
            <div style={styles.meta}>
              ~{' '}
              {new Date(page.end_date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}

          {page.memo?.trim() && (
            <div style={styles.memoBox}>
              <div style={styles.memoLabel}>안내</div>
              <pre style={styles.memo}>{page.memo}</pre>
            </div>
          )}
        </header>

        <section style={styles.records}>
          <div style={styles.recordsBar}>
            <div style={styles.sectionLabel}>기록</div>
            {blockPosts.length > 0 && (
              <div style={styles.viewToggle}>
                <button
                  type="button"
                  style={{
                    ...styles.viewBtn,
                    ...(viewMode === 'list' ? styles.viewBtnOn : {}),
                  }}
                  onClick={() => setViewMode('list')}
                >
                  리스트
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.viewBtn,
                    ...(viewMode === 'block' ? styles.viewBtnOn : {}),
                  }}
                  onClick={() => setViewMode('block')}
                >
                  블록
                </button>
              </div>
            )}
          </div>

          {blockPosts.length === 0 ? (
            <p style={styles.muted}>아직 남긴 글이 없어요.</p>
          ) : viewMode === 'block' ? (
            <MyContentBlock
              title=""
              layout="brick"
              posts={blockPosts}
              emptyLabel="아직 남긴 글이 없어요"
              showInterest={false}
              enableInlineComment={false}
              showHouseName={false}
            />
          ) : (
            <div style={styles.list}>
              {blockPosts.map((post) => (
                <PostBlock
                  key={post.id}
                  post={post}
                  showInterest={false}
                  enableInlineComment={false}
                />
              ))}
            </div>
          )}
        </section>

        <p style={styles.footer}>CoreNull</p>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: '#F5F0E8',
    padding: '20px 12px 48px',
    display: 'flex',
    justifyContent: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 960,
  },
  header: {
    background: '#FEFCF8',
    borderRadius: 20,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '28px 24px 22px',
    marginBottom: 16,
    boxShadow: '0 2px 16px rgba(44,24,16,0.05)',
  },
  badge: {
    fontSize: 12,
    color: '#4A7C3F',
    fontWeight: 600,
    marginBottom: 8,
  },
  house: {
    fontSize: 13,
    color: '#9A8470',
    marginBottom: 4,
  },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 26,
    fontWeight: 600,
    color: '#2C1810',
    margin: '0 0 8px',
    lineHeight: 1.35,
  },
  meta: {
    fontSize: 13,
    color: '#5C4A35',
    marginBottom: 16,
  },
  memoBox: {
    background: 'rgba(74,124,63,0.06)',
    border: '1px solid rgba(74,124,63,0.18)',
    borderRadius: 14,
    padding: '14px 16px',
  },
  memoLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#4A7C3F',
    marginBottom: 8,
  },
  memo: {
    margin: 0,
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: 14,
    lineHeight: 1.7,
    color: '#2C1810',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  records: {
    background: '#FEFCF8',
    borderRadius: 20,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '16px 12px 20px',
    boxShadow: '0 2px 16px rgba(44,24,16,0.05)',
  },
  recordsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px 12px',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#9A8470',
  },
  viewToggle: {
    display: 'flex',
    gap: 4,
    background: '#F5F0E8',
    borderRadius: 10,
    padding: 3,
  },
  viewBtn: {
    border: 'none',
    background: 'transparent',
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    color: '#9A8470',
    cursor: 'pointer',
    fontWeight: 500,
  },
  viewBtnOn: {
    background: '#FEFCF8',
    color: '#2C1810',
    boxShadow: '0 1px 3px rgba(44,24,16,0.08)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '0 4px',
  },
  muted: {
    fontSize: 14,
    color: '#9A8470',
    textAlign: 'center',
    padding: 24,
  },
  error: {
    fontSize: 14,
    color: '#A33',
    textAlign: 'center',
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: '#C4B5A5',
  },
}
