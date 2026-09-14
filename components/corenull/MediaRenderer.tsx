'use client'

import { useEffect, useRef, useState } from 'react'

export type MediaItem = {
  type: 'image' | 'video' | 'audio' | 'pdf' | 'file'
  url: string
  file?: string
}

interface MediaRendererProps {
  media: MediaItem[]
  aspect?: '4 / 3' | '1 / 1'
}

export default function MediaRenderer({ media, aspect = '4 / 3' }: MediaRendererProps) {
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)

  if (!media || media.length === 0) return null

  const slides = media.filter((m) => m.type === 'image' || m.type === 'video')
  const others = media.filter((m) => m.type !== 'image' && m.type !== 'video')
  if (slides.length === 0 && others.length === 0) return null

  const safeIndex = slides.length ? Math.min(index, slides.length - 1) : 0
  const current = slides[safeIndex]

  const go = (dir: -1 | 1) => {
    if (slides.length < 2) return
    setIndex((i) => (i + dir + slides.length) % slides.length)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 40) return
    go(dx < 0 ? 1 : -1)
  }

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowLeft')
        setLightbox((i) => (i === null ? i : (i - 1 + slides.length) % slides.length))
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? i : (i + 1) % slides.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, slides.length])

  return (
    <div style={styles.wrapper}>
      {slides.length > 0 && current && (
        <div
          style={{ ...styles.stage, aspectRatio: aspect }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {current.type === 'image' ? (
            <img src={current.url} alt="" style={styles.cover} onClick={() => setLightbox(safeIndex)} />
          ) : (
            <video
              src={current.url}
              style={styles.cover}
              muted
              playsInline
              autoPlay
              loop
              onClick={() => setLightbox(safeIndex)}
            />
          )}

          {slides.length > 1 && (
            <>
              <button type="button" style={{ ...styles.chev, left: 6 }} onClick={(e) => { e.stopPropagation(); go(-1) }}>‹</button>
              <button type="button" style={{ ...styles.chev, right: 6 }} onClick={(e) => { e.stopPropagation(); go(1) }}>›</button>
              <div style={styles.dots}>
                {slides.map((_, i) => (
                  <span key={i} style={{ ...styles.dot, background: i === safeIndex ? '#FEFCF8' : 'rgba(254,252,248,0.4)' }} />
                ))}
              </div>
              <div style={styles.count}>{safeIndex + 1}/{slides.length}</div>
            </>
          )}
        </div>
      )}

      {others.map((m, idx) => (
        <a key={idx} href={m.url} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
          <span>{m.type === 'audio' ? '🎵' : m.type === 'pdf' ? '📄' : '📎'}</span>
          <span style={styles.fileName}>{m.file || m.url.split('/').pop()}</span>
        </a>
      ))}

      {lightbox !== null && slides[lightbox] && (
        <div
          style={styles.overlay}
          onClick={() => setLightbox(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => {
            if (touchX.current == null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(dx) < 40) return
            setLightbox((i) => {
              if (i === null) return i
              return (i + (dx < 0 ? 1 : -1) + slides.length) % slides.length
            })
          }}
        >
          <button type="button" style={styles.close} onClick={() => setLightbox(null)}>✕</button>
          {slides.length > 1 && (
            <>
              <button type="button" style={{ ...styles.nav, left: 12 }} onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? 0 : (i - 1 + slides.length) % slides.length)) }}>‹</button>
              <button type="button" style={{ ...styles.nav, right: 12 }} onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? 0 : (i + 1) % slides.length)) }}>›</button>
            </>
          )}
          <div style={styles.lbContent} onClick={(e) => e.stopPropagation()}>
            {slides[lightbox].type === 'image' ? (
              <img src={slides[lightbox].url} alt="" style={styles.lbImg} />
            ) : (
              <video src={slides[lightbox].url} controls autoPlay playsInline style={styles.lbVideo} />
            )}
            {slides.length > 1 && <div style={styles.lbCount}>{lightbox + 1} / {slides.length}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 8 },
  stage: { position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', background: '#1C1208' },
  cover: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' },
  chev: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 28, height: 28,
    borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.35)', color: '#FEFCF8',
    fontSize: 18, cursor: 'pointer', lineHeight: '28px', padding: 0,
  },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  count: {
    position: 'absolute', top: 8, right: 8, fontSize: 10, color: '#FEFCF8',
    background: 'rgba(0,0,0,0.4)', padding: '2px 7px', borderRadius: 999,
  },
  fileLink: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#5C4A35',
    textDecoration: 'none', padding: '8px 10px', background: 'rgba(92,61,46,0.06)', borderRadius: 10,
  },
  fileName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  close: {
    position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, cursor: 'pointer', zIndex: 1,
  },
  nav: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 40, height: 40,
    borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff',
    fontSize: 24, cursor: 'pointer', zIndex: 1,
  },
  lbContent: { maxWidth: '100%', maxHeight: '100%', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  lbImg: { maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' },
  lbVideo: { maxWidth: '100%', maxHeight: '85vh' },
  lbCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
}
