'use client'

// 씨드 배포 페이지 (초대장)
// /s/[slug] — 로그인 없이 열림
// 메모(인사·장소·계좌) + 구간 글 묶음
// status: open=초대중 / fruit=수확 완성본 / released=중도해제

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type SeedPost = {
  id: string
  content: string
  created_at: string
  meta?: { media?: { type?: string; url?: string }[]; seed?: { role?: string; phase?: string } }
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

  useEffect(() => {
    if (!slug) return
    fetch(`/api/corenull/seed-pages?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d._error || !d.data) {
          setError(d._error === 'not_found' ? '초대장을 찾을 수 없어요.' : d._error || '불러오지 못했어요.')
        } else {
          setData(d.data)
        }
      })
      .catch(() => setError('불러오지 못했어요.'))
      .finally(() => setLoading(false))
  }, [slug])

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

  const { page, posts, room_name, house_title } = data
  const title = page.title || room_name || '초대장'

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.badge}>
          {page.status === 'fruit' ? '🍎' : page.status === 'open' ? '🌱' : '·'}{' '}
          {STATUS_LABEL[page.status] || page.status}
        </div>
        {house_title && <div style={styles.house}>{house_title}</div>}
        <h1 style={styles.title}>{title}</h1>
        {page.end_date && (
          <div style={styles.meta}>
            ~ {new Date(page.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}

        {page.memo?.trim() && (
          <div style={styles.memoBox}>
            <div style={styles.memoLabel}>안내</div>
            <pre style={styles.memo}>{page.memo}</pre>
          </div>
        )}

        <div style={styles.sectionLabel}>기록</div>
        {posts.length === 0 ? (
          <p style={styles.muted}>아직 남긴 글이 없어요.</p>
        ) : (
          <div style={styles.list}>
            {posts.map((p) => {
              const media = p.meta?.media || []
              const img = media.find((m) => m.type === 'image' && m.url)
              return (
                <article key={p.id} style={styles.post}>
                  {img?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt="" style={styles.img} />
                  )}
                  <p style={styles.content}>{p.content}</p>
                  <time style={styles.time}>
                    {new Date(p.created_at).toLocaleDateString('ko-KR')}
                  </time>
                </article>
              )
            })}
          </div>
        )}

        <p style={styles.footer}>CoreNull</p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: '#F5F0E8',
    padding: '24px 16px 48px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: '#FEFCF8',
    borderRadius: 20,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '28px 22px',
    boxShadow: '0 2px 20px rgba(44,24,16,0.06)',
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
    fontSize: 24,
    fontWeight: 600,
    color: '#2C1810',
    margin: '0 0 8px',
    lineHeight: 1.35,
  },
  meta: {
    fontSize: 13,
    color: '#5C4A35',
    marginBottom: 20,
  },
  memoBox: {
    background: 'rgba(74,124,63,0.06)',
    border: '1px solid rgba(74,124,63,0.18)',
    borderRadius: 14,
    padding: '14px 16px',
    marginBottom: 24,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9A8470',
    marginBottom: 12,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  post: {
    borderTop: '1px solid rgba(92,61,46,0.08)',
    paddingTop: 14,
  },
  img: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 10,
    display: 'block',
    objectFit: 'cover',
    maxHeight: 280,
  },
  content: {
    margin: '0 0 6px',
    fontSize: 15,
    lineHeight: 1.65,
    color: '#2C1810',
    whiteSpace: 'pre-wrap',
  },
  time: {
    fontSize: 11,
    color: '#9A8470',
  },
  muted: {
    fontSize: 14,
    color: '#9A8470',
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: '#A33',
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 11,
    color: '#C4B5A5',
  },
}
