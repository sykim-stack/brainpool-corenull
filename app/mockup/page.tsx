'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { DiscoveryItem } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'
import { RingData } from '@/components/blocks/RingBlock'

const MOCK_POSTS: PostBlockData[] = [
  {
    id: 'mock-1',
    content: '오늘은 집 앞의 빛이 조금 더 오래 머물렀다.\n누군가와 나누고 싶은 조용한 장면.',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    comment_count: 3,
    view_meta: { house_name: '느린 오후의 집', room_name: '빛이 머무는 방', relation: '나', stage_emoji: '🌿' },
  },
  {
    id: 'mock-2',
    content: '베트남에서 보내온 안부를 오늘의 언어로 적어 둡니다.\n말보다 먼저 도착한 마음.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    comment_count: 7,
    view_meta: { house_name: '느린 오후의 집', room_name: '안부를 놓는 방', relation: '공개', stage_emoji: '🌱' },
  },
  {
    id: 'mock-3',
    content: '이번 주말에는 작은 식탁을 밖으로 꺼내 놓을 예정입니다. 지나가다 앉아도 좋아요.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    comment_count: 1,
    view_meta: { house_name: '느린 오후의 집', room_name: '마당의 약속', relation: '나', stage_emoji: '🌸' },
  },
]

const MOCK_NEIGHBORS: NeighborChip[] = [
  { neighborId: 'neighbor-1', houseId: 'house-2', title: '작은 강의 집', langFlag: '🇻🇳' },
  { neighborId: 'neighbor-2', houseId: 'house-3', title: '바람이 부는 집', langFlag: '🇰🇷' },
  { neighborId: 'neighbor-3', houseId: 'house-4', title: '초록 창의 집', langFlag: '🇺🇸' },
]

const MOCK_DISCOVERIES: DiscoveryItem[] = [
  { id: 'discovery-1', label: '🌱 안부를 놓는 방에 새 씨앗이 도착했어요' },
  { id: 'discovery-2', label: '💬 바람이 부는 집에서 번역 도움이 필요해요' },
]

const MOCK_RING: RingData = {
  rings: [
    { index: 0, weight: 0.82 },
    { index: 1, weight: 0.56 },
    { index: 2, weight: 0.38 },
  ],
}

export default function YardMockupPage() {
  const router = useRouter()
  const [discoveries, setDiscoveries] = useState(MOCK_DISCOVERIES)
  const [interestIds, setInterestIds] = useState<string[]>(['mock-2'])

  const toggleInterest = (postId: string) => {
    setInterestIds((current) => current.includes(postId)
      ? current.filter((id) => id !== postId)
      : [...current, postId])
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
        posts={MOCK_POSTS}
        onPostClick={() => undefined}
        onCommentClick={() => undefined}
        showInterest
        getInterestState={(postId) => interestIds.includes(postId) ? 'active' : 'none'}
        onInterestClick={toggleInterest}
        neighbors={MOCK_NEIGHBORS}
        onNeighborClick={() => undefined}
        discoveries={discoveries}
        onDiscoveryDismiss={(id) => setDiscoveries((current) => current.filter((item) => item.id !== id))}
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
    gap: 7,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#C17F3C',
    flexShrink: 0,
  },
}
