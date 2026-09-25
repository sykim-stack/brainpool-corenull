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
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)'
const RING_SIZE = 156
const BG_HEIGHT = 220

export default function HeroBlock({ background, ring, avatar, doorplate }: HeroBlockProps) {
  const stats = [doorplate.since, formatCount(doorplate.roomCount, '방'), formatCount(doorplate.neighborCount, '이웃')]
    .filter(Boolean)
    .join(' · ')
  // DB에 예전 House가 있어 설정이 일부만 와도 Hero는 안전한 기본값으로 렌더링한다.
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
      </div>

      <div style={styles.ringHolder}>
        <RingBlock data={ring} size={RING_SIZE} centerContent={avatar} />
      </div>

      <div style={styles.doorplate}>
        {doorplate.langFlag && <div style={styles.flag}>{doorplate.langFlag}</div>}
        <div style={styles.title}>{doorplate.title}</div>
        {doorplate.description && <div style={styles.description}>{doorplate.description}</div>}
        {stats && <div style={styles.stats}>{stats}</div>}
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
    background: 'linear-gradient(180deg, rgba(15,25,20,0.08) 0%, rgba(15,25,20,0.02) 46%, rgba(15,25,20,0.32) 100%)',
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
  ringHolder: {
    position: 'absolute',
    top: BG_HEIGHT - RING_SIZE / 2,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2,
  },
  doorplate: {
    paddingTop: RING_SIZE / 2 + 16,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    background: '#FEFCF8',
  },
  flag: { fontSize: 12, color: '#9A8470' },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 20,
    fontWeight: 600,
    color: '#1C1208',
  },
  description: {
    fontSize: 13,
    color: '#5C4A35',
    lineHeight: 1.5,
  },
  stats: {
    fontSize: 12,
    color: '#9A8470',
    marginTop: 4,
  },
  cta: {
    marginTop: 10,
    padding: '10px 24px',
    borderRadius: 20,
    border: '1px solid rgba(74,82,64,0.25)',
    background: 'rgba(74,82,64,0.06)',
    color: '#4A5240',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
