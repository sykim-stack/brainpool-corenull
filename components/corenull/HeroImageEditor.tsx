'use client'

import { useEffect, useRef, useState } from 'react'

export type HeroImagePosition = {
  x: number
  y: number
  scale: number
}

export const DEFAULT_HERO_IMAGE_POSITION: HeroImagePosition = { x: 50, y: 50, scale: 1 }

type Props = {
  url: string
  value?: Partial<HeroImagePosition> | null
  label: string
  onSave: (value: HeroImagePosition) => Promise<void> | void
  onClose: () => void
}

function normalize(value?: Partial<HeroImagePosition> | null): HeroImagePosition {
  return {
    x: Math.min(100, Math.max(0, Number(value?.x ?? 50))),
    y: Math.min(100, Math.max(0, Number(value?.y ?? 50))),
    scale: Math.min(2.5, Math.max(1, Number(value?.scale ?? 1))),
  }
}

export default function HeroImageEditor({ url, value, label, onSave, onClose }: Props) {
  const [position, setPosition] = useState(() => normalize(value))
  const [saving, setSaving] = useState(false)
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)

  useEffect(() => {
    setPosition(normalize(value))
  }, [value])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      x: position.x,
      y: position.y,
      startX: event.clientX,
      startY: event.clientY,
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    // 드래그 방향과 배경 이동 방향을 직관적으로 맞춘다.
    setPosition((current) => ({
      ...current,
      x: Math.min(100, Math.max(0, drag.x - (event.clientX - drag.startX) / 3)),
      y: Math.min(100, Math.max(0, drag.y - (event.clientY - drag.startY) / 2)),
    }))
  }

  const stopDragging = () => {
    dragRef.current = null
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(position)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-label={`${label} 위치 조절`}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>{label} 위치 조절</div>
            <div style={styles.hint}>이미지를 끌어서 중심을 맞추고 확대율을 조절하세요.</div>
          </div>
          <button type="button" onClick={onClose} style={styles.close} disabled={saving} aria-label="닫기">×</button>
        </div>

        <div
          style={{
            ...styles.canvas,
            backgroundImage: `url(${url})`,
            backgroundPosition: `${position.x}% ${position.y}%`,
            backgroundSize: position.scale === 1 ? 'cover' : `${position.scale * 100}%`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <div style={styles.overlay}>드래그해서 위치 조절</div>
        </div>

        <label style={styles.sliderLabel}>
          <span>확대</span>
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.05"
            value={position.scale}
            onChange={(event) => setPosition((current) => ({ ...current, scale: Number(event.target.value) }))}
            style={styles.slider}
          />
          <strong>{position.scale.toFixed(2)}×</strong>
        </label>

        <div style={styles.footer}>
          <button type="button" onClick={() => setPosition(DEFAULT_HERO_IMAGE_POSITION)} style={styles.reset} disabled={saving}>가운데로</button>
          <div style={styles.footerRight}>
            <button type="button" onClick={onClose} style={styles.cancel} disabled={saving}>취소</button>
            <button type="button" onClick={save} style={styles.save} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(28,18,8,0.56)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: 'min(100%, 520px)', background: '#FEFCF8', borderRadius: 18, padding: 16, boxShadow: '0 18px 50px rgba(28,18,8,0.25)' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  title: { fontFamily: "'Noto Serif KR', serif", fontSize: 17, fontWeight: 600, color: '#2C1810' },
  hint: { marginTop: 4, fontSize: 11, color: '#9A8470' },
  close: { border: 0, background: 'none', color: '#9A8470', fontSize: 26, lineHeight: 1, cursor: 'pointer' },
  canvas: { height: 'min(52vw, 250px)', minHeight: 170, borderRadius: 14, backgroundRepeat: 'no-repeat', cursor: 'grab', touchAction: 'none', position: 'relative', overflow: 'hidden' },
  overlay: { position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', padding: '6px 10px', borderRadius: 999, background: 'rgba(28,18,8,0.62)', color: '#FEFCF8', fontSize: 11, pointerEvents: 'none', whiteSpace: 'nowrap' },
  sliderLabel: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, color: '#5C4A35', fontSize: 12 },
  slider: { flex: 1, accentColor: '#C17F3C' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  footerRight: { display: 'flex', gap: 8 },
  reset: { border: 0, background: 'none', color: '#9A8470', fontSize: 12, cursor: 'pointer' },
  cancel: { height: 40, padding: '0 14px', border: '1px solid rgba(92,61,46,0.15)', background: 'none', borderRadius: 10, color: '#5C4A35', cursor: 'pointer' },
  save: { height: 40, padding: '0 18px', border: 0, background: '#2C1810', borderRadius: 10, color: '#FEFCF8', cursor: 'pointer' },
}

export { normalize as normalizeHeroImagePosition }

