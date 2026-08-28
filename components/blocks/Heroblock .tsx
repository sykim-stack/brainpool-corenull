'use client'

import RingBlock, { RingData } from './RingBlock'

// ─────────────────────────────────────────────────────────────
// HeroBlock — 마당/거실 공통 상단 블록.
//
// §3 결정: 마당과 거실은 완전히 동일한 Hero+Doorplate+Ring 구조를
// 쓴다. 차이는 배경(외부/내부)과 그 아래 이어지는 NeighborBlock의
// tier(public/invite)뿐이며, 그 차이는 이 블록의 관심사가 아니다.
// 이 블록은 자기가 마당인지 거실인지 몰라야 한다 — background와
// ring, doorplate 값을 전부 호출부가 결정해서 내려준다.
//
// Ring은 배경(green)과 정보영역(white) 경계선에 정확히 반씩
// 걸치도록 배치한다 (Image 1 목업 기준).
// ─────────────────────────────────────────────────────────────

export interface HeroBackground {
  // 이미지 URL이 있으면 이미지, 없으면 gradient 기본값 사용.
  // 외부(마당)/내부(거실) 중 무엇을 넣을지는 호출부가 결정.
  imageUrl?: string | null
  gradient?: string // CSS gradient 문자열, imageUrl 없을 때 fallback
}

export interface HeroDoorplate {
  langFlag?: string       // 예: '🇰🇷'
  title: string
  description?: string | null
  since?: string | null    // 이미 포맷된 문자열 (예: '2026.03.14 부터')
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
  avatar?: React.ReactNode // Ring 중앙에 얹을 아이콘/이미지
  doorplate: HeroDoorplate
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)'
const RING_SIZE = 120
const BG_HEIGHT = 220

export default function HeroBlock({ background, ring, avatar, doorplate }: HeroBlockProps) {
  const stats = [doorplate.since, formatCount(doorplate.roomCount, '방'), formatCount(doorplate.neighborCount, '이웃')]
    .filter(Boolean)
    .join(' · ')

  return (
    <div style={styles.wrapper}>
      {/* 배경 — 외부(마당)/내부(거실) 여부는 호출부 책임 */}
      <div
        style={{
          ...styles.background,
          backgroundImage: background.imageUrl
            ? `url(${background.imageUrl})`
            : background.gradient || DEFAULT_GRADIENT,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Ring — 배경/정보영역 경계선에 정확히 반씩 걸침 */}
      <div style={styles.ringHolder}>
        <RingBlock data={ring} size={RING_SIZE} centerContent={avatar} />
      </div>

      {/* Doorplate — 정보 영역 */}
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
    width: '100%',
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