'use client'

import { useState } from 'react'

export type MediaItem = {
  type: 'image' | 'video' | 'audio' | 'pdf' | 'file'
  url: string
  file?: string
}

interface MediaRendererProps {
  media: MediaItem[]
}

export default function MediaRenderer({ media }: MediaRendererProps) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (!media || media.length === 0) return null

  const images = media.filter(m => m.type === 'image')
  const videos = media.filter(m => m.type === 'video')
  const others = media.filter(m => m.type !== 'image' && m.type !== 'video')

  return (
    <div style={styles.wrapper}>
      {/* 이미지 레이아웃 */}
      {images.length > 0 && (
        <div style={styles.imageContainer}>
          {images.length === 1 && (
            <div style={styles.single} onClick={() => setLightbox(images[0].url)}>
              <img src={images[0].url} alt="" style={styles.imgFull} />
            </div>
          )}
          {images.length === 2 && (
            <div style={styles.grid2}>
              {images.map((m, i) => (
                <div key={i} style={styles.gridItem} onClick={() => setLightbox(m.url)}>
                  <img src={m.url} alt="" style={styles.imgCover} />
                </div>
              ))}
            </div>
          )}
          {images.length === 3 && (
            <div style={styles.grid3}>
              <div style={styles.grid3Main} onClick={() => setLightbox(images[0].url)}>
                <img src={images[0].url} alt="" style={styles.imgCover} />
              </div>
              <div style={styles.grid3Side}>
                {images.slice(1).map((m, i) => (
                  <div key={i} style={styles.grid3SideItem} onClick={() => setLightbox(m.url)}>
                    <img src={m.url} alt="" style={styles.imgCover} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {images.length === 4 && (
            <div style={styles.grid4}>
              {images.map((m, i) => (
                <div key={i} style={styles.gridItem} onClick={() => setLightbox(m.url)}>
                  <img src={m.url} alt="" style={styles.imgCover} />
                </div>
              ))}
            </div>
          )}
          {images.length >= 5 && (
            <div style={styles.grid4}>
              {images.slice(0, 3).map((m, i) => (
                <div key={i} style={styles.gridItem} onClick={() => setLightbox(m.url)}>
                  <img src={m.url} alt="" style={styles.imgCover} />
                </div>
              ))}
              <div
                style={styles.gridItem}
                onClick={() => setLightbox(images[3].url)}
              >
                <img src={images[3].url} alt="" style={{ ...styles.imgCover, filter: 'brightness(0.5)' }} />
                <div style={styles.moreOverlay}>+{images.length - 3}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 비디오 */}
      {videos.map((m, i) => (
        <div key={i} style={styles.videoWrap}>
          <video src={m.url} controls style={styles.video} />
        </div>
      ))}

      {/* 기타 파일 */}
      {others.map((m, i) => (
        <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
          <span style={styles.fileIcon}>
            {m.type === 'audio' ? '🎵' : m.type === 'pdf' ? '📄' : '📎'}
          </span>
          <span style={styles.fileName}>{m.file || m.url.split('/').pop()}</span>
        </a>
      ))}

      {/* Lightbox */}
      {lightbox && (
        <div style={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" style={styles.lightboxImg} />
          <button style={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { marginBottom: 16 },
  imageContainer: { borderRadius: 12, overflow: 'hidden' },
  single: { width: '100%', cursor: 'pointer' },
  imgFull: { width: '100%', display: 'block' },
  imgCover: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  grid2: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
  },
  gridItem: {
    aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', position: 'relative',
  },
  grid3: {
    display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, height: 240,
  },
  grid3Main: { overflow: 'hidden', cursor: 'pointer' },
  grid3Side: { display: 'flex', flexDirection: 'column', gap: 2 },
  grid3SideItem: { flex: 1, overflow: 'hidden', cursor: 'pointer' },
  grid4: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
  },
  moreOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 700, color: 'white',
  },
  videoWrap: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  video: { width: '100%', display: 'block' },
  fileLink: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', marginTop: 4,
    background: '#F5F0E8', borderRadius: 10,
    textDecoration: 'none', color: '#1C1208',
  },
  fileIcon: { fontSize: 18 },
  fileName: { fontSize: 13, color: '#5C4A35' },
  lightboxOverlay: {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  lightboxImg: {
    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
  },
  lightboxClose: {
    position: 'absolute', top: 16, right: 16,
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: 'white', fontSize: 20, width: 40, height: 40,
    borderRadius: '50%', cursor: 'pointer',
  },
}