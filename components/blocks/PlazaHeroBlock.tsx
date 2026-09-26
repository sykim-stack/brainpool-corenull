'use client'

import HeroBlock from './HeroBlock'
import { RingData } from './RingBlock'

const PLAZA_RING: RingData = {
  rings: [
    { index: 0, weight: 0.55 },
    { index: 1, weight: 0.38 },
    { index: 2, weight: 0.22 },
  ],
}

/**
 * 광장 상단은 기능 설명보다 장소의 인상만 먼저 남긴다.
 * 공지 데이터가 생기면 문패 아래 reserved 슬롯에 연결하고,
 * 지금은 비워 둔 채 다음 발견 영역으로 시선을 넘긴다.
 */
export default function PlazaHeroBlock({ onRandomVisit }: { onRandomVisit?: () => void }) {
  return (
    <>
      <HeroBlock
        background={{
          gradient: 'linear-gradient(135deg, #6D5A47 0%, #A7835E 52%, #D8C4A8 100%)',
        }}
        ring={PLAZA_RING}
        avatar={<span style={{ fontSize: 42 }}>🏛️</span>}
        doorplate={{ title: '광장' }}
        heroControls={onRandomVisit ? <button type="button" title="문 열기" aria-label="문 열기" onClick={onRandomVisit} style={styles.randomDoor}>🚪</button> : undefined}
      />
      <div aria-label="광장 공지" data-plaza-announcement-slot="reserved" style={styles.announcementSlot} />
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  announcementSlot: {
    minHeight: 12,
    borderBottom: '1px solid rgba(92,61,46,0.06)',
    background: 'rgba(255,255,255,0.18)',
  },
  randomDoor: {
    width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(254,252,248,0.65)',
    background: 'rgba(28,18,8,0.42)', color: '#FEFCF8', fontSize: 18, cursor: 'pointer',
    backdropFilter: 'blur(6px)',
  },
}
