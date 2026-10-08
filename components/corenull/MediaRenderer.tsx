'use client'

import { useEffect, useRef, useState } from 'react'

export type MediaItem = {
  type: 'image' | 'video' | 'audio' | 'pdf' | 'file' | string
  url: string
  file?: string
}

interface MediaRendererProps {
  media: MediaItem[]
  aspect?: '4 / 3' | '1 / 1' | 'fill'
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

function Thumb({ item, active, onSelect }: { item: MediaItem; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      aria-label="미디어 선택"
      aria-pressed={active}
      style={{
        ...styles.thumbBtn,
        ...(active ? styles.thumbBtnActive : {}),
      }}
    >
      {item.type === 'video' ? (
        <>
          <video src={item.url} muted playsInline preload="metadata" style={styles.thumbMedia} />
          <span style={styles.thumbVideoBadge}>▶</span>
        </>
      ) : (
        <img src={item.url} alt="" style={styles.thumbMedia} />
      )}
    </button>
  )
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
    <div
      style={{
        ...styles.wrapper,
        ...(aspect === 'fill' ? { height: '100%', display: 'flex', flexDirection: 'column' } : {}),
      }}
      onClick={guard}
    >
      {slides.length > 0 && current && (
        <div
          style={{
            ...styles.stage,
            ...(aspect === 'fill'
              ? { height: '100%', flex: 1, minHeight: 0 }
              : { aspectRatio: aspect }),
          }}
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
              <div style={styles.count}>
                {safeIndex + 1}/{slides.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* 점 대신 썸네일 — 여러 장임을 바로 알 수 있게 */}
      {slides.length > 1 && (
        <div style={styles.thumbRow} aria-label="미디어 썸네일">
          {slides.map((item, i) => (
            <Thumb
              key={`${item.url}-${i}`}
              item={item}
              active={i === safeIndex}
              onSelect={() => setIndex(i)}
            />
          ))}
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
              <>
                <div style={styles.lbCount}>
                  {lightbox + 1} / {slides.length}
                </div>
                <div style={styles.lbThumbRow}>
                  {slides.map((item, i) => (
                    <Thumb
                      key={`lb-${item.url}-${i}`}
                      item={item}
                      active={i === lightbox}
                      onSelect={() => setLightbox(i)}
                    />
                  ))}
                </div>
              </>
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
  thumbRow: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    padding: '0 2px',
    WebkitOverflowScrolling: 'touch',
  },
  thumbBtn: {
    position: 'relative',
    flex: '0 0 auto',
    width: 48,
    height: 48,
    borderRadius: 8,
    border: '2px solid transparent',
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
    background: '#EDE6DC',
  },
  thumbBtnActive: {
    borderColor: '#2C1810',
    boxShadow: '0 0 0 1px rgba(44,24,16,0.15)',
  },
  thumbMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  thumbVideoBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    fontSize: 9,
    color: '#FEFCF8',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: '1px 3px',
    lineHeight: 1.2,
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
  lbImg: { maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' },
  lbVideo: { maxWidth: '100%', maxHeight: '75vh' },
  lbCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  lbThumbRow: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    maxWidth: '100%',
    paddingBottom: 4,
  },
}
