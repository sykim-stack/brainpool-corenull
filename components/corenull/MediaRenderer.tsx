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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!media || media.length === 0) return null

  const images = media.filter(m => m.type === 'image')
  const videos = media.filter(m => m.type === 'video')
  const others = media.filter(m => m.type !== 'image' && m.type !== 'video')

  const prevImage = () => setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))
  const nextImage = () => setLightboxIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : prev))

  return (
    <div style={styles.wrapper}>
      {images.length === 1 && (
        <div style={styles.single} onClick={() => setLightboxIndex(0)}>
          <img src={images[0].url} alt="" style={styles.imgFull} />
        </div>
      )}

      {images.length > 1 && (
        <div style={styles.scrollRow}>
          {images.map((m, idx) => (
            <div key={idx} style={styles.scrollItem} onClick={() => setLightboxIndex(idx)}>
              <img src={m.url} alt="" style={styles.scrollImg} />
            </div>
          ))}
        </div>
      )}

      {videos.map((m, idx) => (
        <div key={idx} style={styles.videoWrap}>
          <video src={m.url} controls style={styles.video} />
        </div>
      ))}

      {others.map((m, idx) => (
        <a key={idx} href={m.url} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
          <span style={styles.fileIcon}>
            {m.type === 'audio' ? '🎵' : m.type === 'pdf' ? '📄' : '📎'}
          </span>
          <span style={styles.fileName}>{m.file || m.url.split('/').pop()}</span>
        </a>
      ))}

      {lightboxIndex !== null && (
        <div style={styles.lightboxOverlay} onClick={() => setLightboxIndex(null)}>
          <button style={styles.lightboxClose} onClick={() => setLightboxIndex(null)}>✕</button>

          {/* 왼쪽 버튼 */}
          {images.length > 1 && lightboxIndex > 0 && (
            <button style={styles.navLeft} onClick={e => { e.stopPropagation(); prevImage() }}>‹</button>
          )}

          {/* 이미지 */}
          <div style={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <img src={images[lightboxIndex].url} alt="" style={styles.lightboxImg} />
            {images.length > 1 && (
              <span style={styles.navCount}>{lightboxIndex + 1} / {images.length}</span>
            )}
          </div>

          {/* 오른쪽 버튼 */}
          {images.length > 1 && lightboxIndex < images.length - 1 && (
            <button style={styles.navRight} onClick={e => { e.stopPropagation(); nextImage() }}>›</button>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { marginBottom: 12 },
  single: { width: '100%', cursor: 'pointer', borderRadius: 12, overflow: 'hidden' },
  imgFull: { width: '100%', display: 'block' },
  scrollRow: {
    display: 'flex', gap: 8, overflowX: 'auto',
    scrollSnapType: 'x mandatory', paddingBottom: 4,
  } as any,
  scrollItem: {
    flexShrink: 0, width: 260, height: 260,
    borderRadius: 12, overflow: 'hidden',
    cursor: 'pointer', scrollSnapAlign: 'start',
  },
  scrollImg: { width: '100%', height: '100%', objectFit: 'cover' },
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
    background: 'rgba(0,0,0,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute', top: 16, right: 16,
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: 'white', fontSize: 20, width: 40, height: 40,
    borderRadius: '50%', cursor: 'pointer', zIndex: 301,
  },
  navLeft: {
    position: 'absolute', left: 16,
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: 'white', fontSize: 32, width: 44, height: 44,
    borderRadius: '50%', cursor: 'pointer', zIndex: 301,
  },
  navRight: {
    position: 'absolute', right: 16,
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: 'white', fontSize: 32, width: 44, height: 44,
    borderRadius: '50%', cursor: 'pointer', zIndex: 301,
  },
  lightboxContent: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    maxWidth: '90vw', maxHeight: '90vh',
  },
  lightboxImg: {
    maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8,
  },
  navCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
}