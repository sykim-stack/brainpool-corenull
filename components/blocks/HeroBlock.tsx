'use client'

import RingBlock, { RingData } from './RingBlock'

export interface HeroBackground {
  imageUrl?: string | null
  gradient?: string
  position?: { x?: number; y?: number; scale?: number } | null
}

export interface HeroDoorplate {
  langFlag?: string
  title: string
  description?: string | null
  since?: string | null
  roomCount?: number
  neighborCount?: number
  cta?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
}

export interface HeroBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate
  heroControls?: React.ReactNode
  avatarControls?: React.ReactNode
  /** 마당 전용: 집 전환·문패 수정 등 손잡이 (문패 아래) */
  doorplateHandles?: React.ReactNode
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)'
const RING_SIZE = 230
const BG_HEIGHT = 220

export default function HeroBlock({
  background,
  ring,
  avatar,
  doorplate,
  heroControls,
  avatarControls,
  doorplateHandles,
}: HeroBlockProps) {
  const stats = [doorplate.since, formatCount(doorplate.roomCount, '방'), formatCount(doorplate.neighborCount, '이웃')]
    .filter((value): value is string => Boolean(value))
  const imagePosition = { x: 50, y: 50, scale: 1, ...(background.position || {}) }

  return (
    <div style={styles.wrapper}>
      <div
        className="bleed-full"
        style={{
          ...styles.background,
          backgroundImage: background.imageUrl
            ? `url(${background.imageUrl})`
            : background.gradient || DEFAULT_GRADIENT,
          backgroundSize: imagePosition.scale === 1 ? 'cover' : `${imagePosition.scale * 100}%`,
          backgroundPosition: `${imagePosition.x ?? 50}% ${imagePosition.y ?? 50}%`,
        }}
      >
        <div style={styles.backgroundShade} />
        <div style={styles.backgroundGlow} />
        <div style={styles.heroEdge} aria-hidden="true" />
        {heroControls && <div style={styles.heroControls}>{heroControls}</div>}
      </div>

      <div style={styles.ringHolder}>
        <div
          className="cn-avatar-edit-zone"
          tabIndex={0}
          style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, outline: 'none' }}
        >
          <RingBlock data={ring} size={RING_SIZE} centerContent={avatar} />
          {avatarControls && (
            <div
              style={styles.avatarControlsSlot}
              onClick={(e) => e.stopPropagation()}
            >
              {avatarControls}
            </div>
          )}
        </div>
      </div>

      <div style={styles.doorplate}>
        {doorplate.langFlag && <div style={styles.flag}>{doorplate.langFlag}</div>}
        {doorplate.title && (
          <>
            <div style={styles.title}>{doorplate.title}</div>
            <div style={styles.titleRule} aria-hidden="true">
              <span style={styles.titleRuleLine} />
              <span style={styles.titleRuleSeal} />
              <span style={styles.titleRuleLine} />
            </div>
          </>
        )}
        {doorplate.description && <div style={styles.description}>{doorplate.description}</div>}
        {stats.length > 0 && (
          <div style={styles.stats}>
            {stats.map((item) => <span key={item} style={styles.statPill}>{item}</span>)}
          </div>
        )}
        {doorplateHandles}
        {doorplate.cta && (
          <button
            style={{ ...styles.cta, opacity: doorplate.cta.disabled ? 0.5 : 1 }}
            onClick={doorplate.cta.onClick}
            disabled={doorplate.cta.disabled}
          >
            {doorplate.cta.label}
          </button>
        )}
      </div>
    </div>
  )
}

function formatCount(n: number | undefined, label: string) {
  if (n === undefined || n === null) return ''
  return `${label} ${n}${label === '방' ? '개' : ''}`
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
  },
  background: {
    height: BG_HEIGHT,
    width: '100vw',
    left: '50%',
    marginLeft: '-50vw',
    position: 'relative',
    overflow: 'hidden',
    isolation: 'isolate',
  },
  backgroundShade: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(15,25,20,0.10) 0%, rgba(15,25,20,0.02) 42%, rgba(15,25,20,0.38) 100%)',
    pointerEvents: 'none',
  },
  backgroundGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    right: -70,
    top: -100,
    borderRadius: '50%',
    background: 'rgba(255,244,194,0.18)',
    filter: 'blur(18px)',
    pointerEvents: 'none',
  },
  heroEdge: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    width: 54,
    height: 2,
    transform: 'translateX(-50%)',
    borderRadius: 999,
    background: 'linear-gradient(90deg, rgba(193,127,60,0.25), #E4C77F, rgba(193,127,60,0.25))',
    boxShadow: '0 0 9px rgba(228,199,127,0.3)',
    pointerEvents: 'none',
  },
  heroControls: {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    pointerEvents: 'none',
  },
  avatarControlsSlot: {
    position: 'absolute',
    right: 0,
    bottom: 20,
    zIndex: 30,
    pointerEvents: 'auto',
  },
  ringHolder: {
    position: 'absolute',
    top: BG_HEIGHT - RING_SIZE / 2,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
  },
  doorplate: {
    position: 'relative',
    zIndex: 1,
    paddingTop: RING_SIZE / 2 + 16,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 7,
    background: 'linear-gradient(180deg, #FEFCF8 0%, #FBF7EF 100%)',
    borderTop: '1px solid rgba(193,127,60,0.16)',
    borderBottom: '1px solid rgba(92,61,46,0.08)',
  },
  flag: {
    minWidth: 30,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    padding: '0 8px',
    borderRadius: 999,
    border: '1px solid rgba(193,127,60,0.2)',
    background: 'rgba(255,248,233,0.86)',
    fontSize: 12,
    color: '#9A8470',
  },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 21,
    fontWeight: 600,
    color: '#1C1208',
    letterSpacing: '0.015em',
    textShadow: '0 1px 0 rgba(255,255,255,0.8)',
  },
  titleRule: { display: 'flex', alignItems: 'center', gap: 7, height: 8 },
  titleRuleLine: {
    width: 22,
    height: 1,
    background: 'linear-gradient(90deg, rgba(193,127,60,0.12), rgba(193,127,60,0.58))',
  },
  titleRuleSeal: {
    width: 5,
    height: 5,
    transform: 'rotate(45deg)',
    border: '1px solid #B97835',
    background: '#EAD6A3',
  },
  description: {
    fontSize: 13,
    color: '#5C4A35',
    lineHeight: 1.5,
    maxWidth: 520,
  },
  stats: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  statPill: {
    padding: '4px 9px',
    borderRadius: 999,
    border: '1px solid rgba(193,127,60,0.18)',
    background: 'rgba(255,250,239,0.82)',
    color: '#79542D',
    fontSize: 11,
    lineHeight: 1.2,
  },
  cta: {
    marginTop: 10,
    padding: '10px 24px',
    borderRadius: 999,
    border: '1px solid rgba(193,127,60,0.36)',
    background: 'linear-gradient(135deg, #FFF8E9 0%, #F5E7C9 100%)',
    color: '#68491F',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(121,84,45,0.08)',
  },
}
