'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { DiscoveryItem } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'

const MOCK_RING: RingData = {
  rings: [
    { index: 0, weight: 0.85 },
    { index: 1, weight: 0.55 },
    { index: 2, weight: 0.35 },
  ],
}

const MOCK_POSTS: PostBlockData[] = [
  {
    id: 'm1',
    content: '오늘 같이 만든 김치찌개, 완전 성공했다 ㅎㅎ',
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    comment_count: 2,
    view_meta: { house_name: '느린 오후의 집', room_name: '부엌' },
  },
  {
    id: 'm2',
    content: '주말에 다녀온 한강 피크닉',
    created_at: new Date(Date.now() - 86400_000).toISOString(),
    comment_count: 0,
    view_meta: { house_name: '느린 오후의 집', room_name: '일상' },
  },
]

const MOCK_NEIGHBORS: NeighborChip[] = [
  {
    neighborId: 'n1',
    houseId: 'h1',
    title: '베트남 이모집',
    langFlag: '🇻🇳',
    rooms: [],
  },
  {
    neighborId: 'n2',
    houseId: 'h2',
    title: '옆집 민수네',
    langFlag: '🇰🇷',
    rooms: [],
  },
]

export default function MockupYardPage() {
  const router = useRouter()
  const [interestIds, setInterestIds] = useState<string[]>(['m1'])
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>([
    { id: 'd1', label: '🌱 씨앗이 기다리고 있어요' },
  ])

  const toggleInterest = (postId: string) => {
    setInterestIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    )
  }

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="마당 목업"
        actions={[
          { key: 'back', emoji: '×', label: '목업 닫기', onClick: () => router.push('/') },
          { key: 'write', emoji: '＋', label: '글쓰기', onClick: () => undefined },
        ]}
      />

      <YardBlock
        loading={false}
        background={{
          gradient: 'linear-gradient(155deg, #17271f 0%, #314a3b 38%, #809b75 72%, #d7d8b7 100%)',
        }}
        ring={MOCK_RING}
        avatar={<span style={{ fontSize: 25 }}>🏡</span>}
        doorplate={{
          langFlag: '🇰🇷 · 🇻🇳',
          title: '느린 오후의 집',
          description: '말보다 먼저 마음이 머무는 생활 공간',
          since: '2026.03.14 부터',
          roomCount: 6,
          neighborCount: 3,
        }}
        discoveries={discoveries}
        onDiscoveryDismiss={(id) => setDiscoveries((current) => current.filter((item) => item.id !== id))}
        recommended={MOCK_NEIGHBORS}
        neighborFeed={[]}
        myPosts={MOCK_POSTS}
        onPostClick={() => undefined}
        onCommentClick={() => undefined}
        showInterest
        getInterestState={(postId) => (interestIds.includes(postId) ? 'active' : 'none')}
        onInterestClick={toggleInterest}
      />

      <div style={styles.note}>
        <span style={styles.noteDot} />
        <span>실제 데이터 연결 전 · CoreNull 마당 화면 목업</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  note: {
    margin: '4px 16px 24px',
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(74,82,64,0.07)',
    color: '#7B6B57',
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#C17F3C',
    flexShrink: 0,
  },
}
