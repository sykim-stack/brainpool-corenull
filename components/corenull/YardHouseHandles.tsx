'use client'

import { useEffect, useRef, useState } from 'react'

export interface YardHouseOption {
  id: string
  title: string
  langFlag?: string
}

export interface YardHouseHandlesProps {
  houses: YardHouseOption[]
  activeHouseId: string
  onSwitch: (houseId: string) => void
  onCreate: () => void
  onEditDoorplate: () => void
  onOpenImages?: () => void
}

/** 마당 문패 아래 — 집 전환 · 문패 · 이미지 · 새 집 (관리 섹션이 아닌 손잡이) */
export default function YardHouseHandles({
  houses,
  activeHouseId,
  onSwitch,
  onCreate,
  onEditDoorplate,
  onOpenImages,
}: YardHouseHandlesProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const active = houses.find((h) => h.id === activeHouseId)
  const showSwitch = houses.length > 1

  return (
    <div ref={rootRef} style={styles.wrap}>
      <div style={styles.row}>
        {showSwitch ? (
          <button type="button" style={styles.chip} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <span style={styles.chipMain}>
              {active?.langFlag ? `${active.langFlag} ` : ''}{active?.title || '집'}
            </span>
            <span style={styles.chev}>▾</span>
          </button>
        ) : (
          <span style={styles.singleLabel}>{active?.title || '내 집'}</span>
        )}

        <button type="button" style={styles.linkBtn} onClick={onEditDoorplate}>
          문패
        </button>
        {onOpenImages && (
          <button type="button" style={styles.linkBtn} onClick={onOpenImages}>
            이미지
          </button>
        )}
        <button type="button" style={styles.linkBtn} onClick={onCreate}>
          + 새 집
        </button>
      </div>

      {open && showSwitch && (
        <div style={styles.menu} role="listbox">
          {houses.map((h) => (
            <button
              key={h.id}
              type="button"
              role="option"
              aria-selected={h.id === activeHouseId}
              style={{
                ...styles.menuItem,
                ...(h.id === activeHouseId ? styles.menuItemActive : {}),
              }}
              onClick={() => {
                setOpen(false)
                if (h.id !== activeHouseId) onSwitch(h.id)
              }}
            >
              <span>{h.langFlag || '🏡'}</span>
              <span style={styles.menuTitle}>{h.title}</span>
              {h.id === activeHouseId && <span style={styles.check}>✓</span>}
            </button>
          ))}
          <button
            type="button"
            style={styles.menuCreate}
            onClick={() => {
              setOpen(false)
              onCreate()
            }}
          >
            + 새 집 만들기
          </button>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    width: '100%',
    maxWidth: 320,
    marginTop: 4,
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
    padding: '5px 10px',
    borderRadius: 999,
    border: '1px solid rgba(92,61,46,0.14)',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    color: '#2C1810',
  },
  chipMain: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 120,
  },
  chev: { fontSize: 10, color: '#9A8470', flexShrink: 0 },
  singleLabel: {
    fontSize: 11,
    color: '#9A8470',
    padding: '0 4px',
  },
  linkBtn: {
    border: 'none',
    background: 'none',
    padding: '4px 6px',
    fontSize: 11,
    color: '#9A8470',
    cursor: 'pointer',
  },
  menu: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: '100%',
    marginTop: 6,
    minWidth: 200,
    maxWidth: 280,
    background: '#FEFCF8',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(44,24,16,0.12)',
    zIndex: 20,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    background: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 13,
    color: '#2C1810',
  },
  menuItemActive: {
    background: 'rgba(44,24,16,0.06)',
  },
  menuTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  check: { fontSize: 12, color: '#C17F3C' },
  menuCreate: {
    marginTop: 4,
    padding: '10px 12px',
    border: 'none',
    borderTop: '1px solid rgba(92,61,46,0.08)',
    background: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 12,
    color: '#5C4A35',
    fontWeight: 500,
  },
}
