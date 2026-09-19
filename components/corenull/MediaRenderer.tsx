'use client'

import { useEffect, useRef, useState } from 'react'

export type MediaItem = {
  type: 'image' | 'video' | 'audio' | 'pdf' | 'file' | string
  url: string
  file?: string
}

interface MediaRendererProps {
  media: MediaItem[]
  aspect?: '4 / 3' | '1 / 1'
  /** 카드 안에서 클릭 시 상위 onClick 막기 */
  stopCardClick?: boolean
}

function normalizeItem(m: MediaItem): MediaItem | null {
  if (!m?.url) return null
  const url = m.url
  const lower = url.toLowerCase().split('?')[0]
  let type = (m.type || '').toLowerCase()

  if (type.startsWith('image')) type = 'image'
  else if (type.startsWith('video')) type = 'video'
  else if (type.startsWith('audio')) type = 'audio'
  else if (type === 'pdf' || lower.endsWith('.pdf')) type = 'pdf'
  else if (/\.(mp4|webm|mov|m4v|ogg)$/.test(lower)) type = 'video'
  else if (/\.(jpe?g|png|gif|webp|avif|heic|bmp)$/.test(lower)) type = 'image'
  else if (/\.(mp3|wav|m4a|aac)$/.test(lower)) type = 'audio'
  else if (!type) type = 'file'

  return { ...m, type: type as MediaItem['type'], url }
}

export default function MediaRenderer({
  media,
  aspect = '4 / 3',
  stopCardClick = true,
}: MediaRendererProps) {
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)

  if (!media || media.length === 0) return null

  const normalized = media.map(normalizeItem).filter(Boolean) as MediaItem[]
  const slides = normalized.filter((m) => m.type === 'image' || m.type === 'video')
  const others = normalized.filter((m) => m.type !== 'image' && m.type !== 'video')
  if (slides.length === 0 && others.length === 0) return null

  const safeIndex = slides.length ? Math.min(index, slides.length - 1) : 0
  const current = slides[safeIndex]

  const go = (dir: -1 | 1) => {
    if (slides.length < 2) return
    setIndex((i) => (i + dir + slides.length) % slides.length)
  }

  const goLightbox = (dir: -1 | 1) => {
    if (slides.length < 2) return
    setLightbox((i) => {
      if (i === null) return 0
      return (i + dir + slides.length) % slides.length
    })
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEndStage = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 40) return
    go(dx < 0 ? 1 : -1)
  }
  const onTouchEndLightbox = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 40) return
    goLightbox(dx < 0 ? 1 : -1)
  }

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowLeft') goLightbox(-1)
      if (e.key === 'ArrowRight') goLightbox(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, slides.length])

  const guard = (e: React.SyntheticEvent) => {
    if (stopCardClick) e.stopPropagation()
  }

  return (
    <div style={styles.wrapper} onClick={guard}>
      {slides.length > 0 && current && (
        <div
          style={{ ...styles.stage, aspectRatio: aspect }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEndStage}
        >
          {current.type === 'image' ? (
            <img
              src={current.url}
              alt=""
              style={styles.cover}
              onClick={(e) => {
                guard(e)
                setLightbox(safeIndex)
              }}
            />
          ) : (
            <video
              src={current.url}
              style={styles.cover}
              muted
              playsInline
              autoPlay
              loop
              onClick={(e) => {
                guard(e)
                setLightbox(safeIndex)
              }}
            />
          )}

          {slides.length > 1 && (
            <>
              <button
                type="button"
                style={{ ...styles.chev, left: 6 }}
                onClick={(e) => {
                  guard(e)
                  go(-1)
                }}
              >
                ‹
              </button>
              <button
                type="button"
                style={{ ...styles.chev, right: 6 }}
                onClick={(e) => {
                  guard(e)
                  go(1)
                }}
              >
                ›
              </button>
              <div style={styles.dots}>
                {slides.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      ...styles.dot,
                      background: i === safeIndex ? '#FEFCF8' : 'rgba(254,252,248,0.4)',
                    }}
                  />
                ))}
              </div>
              <div style={styles.count}>
                {safeIndex + 1}/{slides.length}
              </div>
            </>
          )}
        </div>
      )}

      {others.map((m, idx) => (
        <a
          key={idx}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.fileLink}
          onClick={guard}
        >
          <span>{m.type === 'audio' ? '🎵' : m.type === 'pdf' ? '📄' : '📎'}</span>
          <span style={styles.fileName}>{m.file || m.url.split('/').pop()}</span>
        </a>
      ))}

      {lightbox !== null && slides[lightbox] && (
        <div
          style={styles.overlay}
          onClick={() => setLightbox(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEndLightbox}
        >
          <button
            type="button"
            style={styles.close}
            onClick={(e) => {
              e.stopPropagation()
              setLightbox(null)
            }}
          >
            ✕
          </button>
          {slides.length > 1 && (
            <>
              <button
                type="button"
                style={{ ...styles.nav, left: 12 }}
                onClick={(e) => {
                  e.stopPropagation()
                  goLightbox(-1)
                }}
              >
                ‹
              </button>
              <button
                type="button"
                style={{ ...styles.nav, right: 12 }}
                onClick={(e) => {
                  e.stopPropagation()
                  goLightbox(1)
                }}
              >
                ›
              </button>
            </>
          )}
          <div style={styles.lbContent} onClick={(e) => e.stopPropagation()}>
            {slides[lightbox].type === 'image' ? (
              <img src={slides[lightbox].url} alt="" style={styles.lbImg} />
            ) : (
              <video
                src={slides[lightbox].url}
                controls
                autoPlay
                playsInline
                style={styles.lbVideo}
              />
            )}
            {slides.length > 1 && (
              <div style={styles.lbCount}>
                {lightbox + 1} / {slides.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 8 },
  stage: {
    position: 'relative',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#1C1208',
  },
  cover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    cursor: 'pointer',
  },
  chev: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.35)',
    color: '#FEFCF8',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: '28px',
    padding: 0,
    zIndex: 2,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 5,
    zIndex: 2,
  },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  count: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 10,
    color: '#FEFCF8',
    background: 'rgba(0,0,0,0.4)',
    padding: '2px 7px',
    borderRadius: 999,
    zIndex: 2,
  },
  fileLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#5C4A35',
    textDecoration: 'none',
    padding: '8px 10px',
    background: 'rgba(92,61,46,0.06)',
    borderRadius: 10,
  },
  fileName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.92)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    zIndex: 1,
  },
  nav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 26,
    cursor: 'pointer',
    zIndex: 1,
  },
  lbContent: {
    maxWidth: '100%',
    maxHeight: '100%',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  lbImg: { maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' },
  lbVideo: { maxWidth: '100%', maxHeight: '85vh' },
  lbCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
}
