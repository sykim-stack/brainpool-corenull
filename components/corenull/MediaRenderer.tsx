'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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

/** 모바일 핀치 줌 + 패닝 (라이트박스 이미지 전용) */
function ZoomableImage({ src, alt = '' }: { src: string; alt?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)

  // refs so handlers always see latest values without re-binding
  const scaleRef = useRef(1)
  const txRef = useRef(0)
  const tyRef = useRef(0)
  const pinchRef = useRef<{
    dist: number
    scale: number
    cx: number
    cy: number
  } | null>(null)
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const lastTapRef = useRef(0)

  const apply = useCallback((s: number, x: number, y: number) => {
    const next = Math.min(4, Math.max(1, s))
    // reset translate when fully zoomed out
    const nx = next <= 1 ? 0 : x
    const ny = next <= 1 ? 0 : y
    scaleRef.current = next
    txRef.current = nx
    tyRef.current = ny
    setScale(next)
    setTx(nx)
    setTy(ny)
  }, [])

  // reset when src changes (slide change)
  useEffect(() => {
    apply(1, 0, 0)
  }, [src, apply])

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.hypot(dx, dy)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      panRef.current = null
      const dist = getDistance(e.touches[0], e.touches[1])
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      pinchRef.current = {
        dist,
        scale: scaleRef.current,
        cx,
        cy,
      }
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      panRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tx: txRef.current,
        ty: tyRef.current,
      }
      pinchRef.current = null
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const dist = getDistance(e.touches[0], e.touches[1])
      const ratio = dist / pinchRef.current.dist
      const nextScale = pinchRef.current.scale * ratio
      apply(nextScale, txRef.current, tyRef.current)
    } else if (e.touches.length === 1 && panRef.current && scaleRef.current > 1) {
      e.preventDefault()
      const dx = e.touches[0].clientX - panRef.current.x
      const dy = e.touches[0].clientY - panRef.current.y
      apply(scaleRef.current, panRef.current.tx + dx, panRef.current.ty + dy)
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
    if (e.touches.length === 0) panRef.current = null

    // double-tap toggle zoom
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        if (scaleRef.current > 1) {
          apply(1, 0, 0)
        } else {
          apply(2.2, 0, 0)
        }
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.zoomWrap,
        touchAction: scale > 1 ? 'none' : 'manipulation',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          ...styles.lbImg,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: pinchRef.current || panRef.current ? 'none' : 'transform 0.15s ease-out',
          cursor: scale > 1 ? 'grab' : 'default',
        }}
      />
    </div>
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
    // 줌 중이면 스와이프 전환 막기
    if (e.touches.length > 1) {
      touchX.current = null
      return
    }
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
    // 핀치 중이었거나 줌 상태면 슬라이드 전환하지 않음
    if (e.changedTouches.length !== 1) {
      touchX.current = null
      return
    }
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
    // body scroll lock while lightbox open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
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
              <ZoomableImage src={slides[lightbox].url} />
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
    zIndex: 2,
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
    zIndex: 2,
  },
  lbContent: {
    maxWidth: '100%',
    maxHeight: '100%',
    width: '100%',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  zoomWrap: {
    width: '100%',
    maxHeight: '75vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    touchAction: 'none',
  },
  lbImg: {
    maxWidth: '100%',
    maxHeight: '75vh',
    objectFit: 'contain',
    transformOrigin: 'center center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    pointerEvents: 'auto',
  },
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
