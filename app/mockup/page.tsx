'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/blocks/TopBar'
import YardBlock, { DiscoveryItem, YardRelationRow } from '@/components/blocks/YardBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { RingData } from '@/components/blocks/RingBlock'
import { NeighborChip } from '@/components/blocks/NeighborContentBlock'

/** 마당 화면 구성 확인용 임시 데이터 — /mockup */

const MOCK_RING: RingData = {
  rings: [
    { index: 0, weight: 0.85 },
    { index: 1, weight: 0.55 },
    { index: 2, weight: 0.35 },
  ],
}

const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/800/600`

function makePost(
  id: string,
  content: string,
  opts: {
    room: string
    status: string
    seed?: string
    hoursAgo?: number
    img?: string
  }
): PostBlockData {
  return {
    id,
    content,
    created_at: new Date(Date.now() - (opts.hoursAgo ?? 3) * 3600_000).toISOString(),
    comment_count: id === 'p1' ? 2 : 0,
    room_id: `room-${id}`,
    media: opts.img
      ? [{ type: 'image', url: opts.img }]
      : [{ type: 'image', url: IMG(id) }],
    view_meta: {
      house_name: '여리 ♥ THI THI',
      room_name: opts.room,
      status: opts.status,
      stage_emoji: opts.seed ? '🌱' : undefined,
    },
  }
}

const ALL_MY_POSTS: PostBlockData[] = [
  makePost('p1', '하준이 100일', {
    room: '하준이 성장일기',
    status: '공개 · 씨드',
    seed: '1',
    hoursAgo: 2,
    img: IMG('hajun100'),
  }),
  makePost('p2', '오늘 같이 만든 김치찌개, 완전 성공했다 ㅎㅎ', {
    room: '일상',
    status: '공개',
    hoursAgo: 20,
    img: IMG('kimchi'),
  }),
  makePost('p3', '주말에 다녀온 한강 피크닉', {
    room: '여행',
    status: '이웃공개',
    hoursAgo: 48,
    img: IMG('picnic'),
  }),
  makePost('p4', '테스트방에 올린 짧은 메모', {
    room: '테스트방',
    status: '공개',
    hoursAgo: 72,
    img: IMG('test'),
  }),
]

const MOCK_NEIGHBOR_FEED: PostBlockData[] = [
  {
    id: 'nf1',
    content: '반려동물 산책 다녀왔어요',
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    comment_count: 1,
    room_id: 'nr1',
    media: [{ type: 'image', url: IMG('pet') }],
    view_meta: {
      house_name: '비단이네',
      room_name: '반려동물',
      status: '공개 · 씨드',
      stage_emoji: '🌱',
    },
  },
  {
    id: 'nf2',
    content: 'Hôm nay ăn gì nhỉ?',
    created_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
    comment_count: 0,
    room_id: 'nr2',
    media: [{ type: 'image', url: IMG('vn') }],
    view_meta: {
      house_name: '베트남집',
      room_name: '일상',
      status: '공개',
    },
  },
]

const MOCK_RECOMMENDED: NeighborChip[] = [
  {
    neighborId: 'rec1',
    houseId: 'h-silk',
    title: '비단이네~~~♡♡♡',
    langFlag: '🇰🇷',
    coverUrl: IMG('yard1'),
    // 골목: 상한 없음 — 최신글 있는 방 전부, 화면만 2 + 점 스와이프
    rooms: [
      {
        roomId: 'r1',
        roomName: '반려동물',
        latestPost: MOCK_NEIGHBOR_FEED[0],
      },
      {
        roomId: 'r2',
        roomName: '일상',
        latestPost: {
          id: 'x1',
          content: '오늘 날씨 좋다',
          created_at: new Date().toISOString(),
          media: [{ type: 'image', url: IMG('sky') }],
        },
      },
      {
        roomId: 'r2b',
        roomName: '부엌',
        latestPost: {
          id: 'x2',
          content: '된장찌개 끓였다',
          created_at: new Date(Date.now() - 3600_000).toISOString(),
          media: [{ type: 'image', url: IMG('soup') }],
        },
      },
      {
        roomId: 'r2c',
        roomName: '산책',
        latestPost: {
          id: 'x3',
          content: '한강 산책',
          created_at: new Date(Date.now() - 7200_000).toISOString(),
          media: [{ type: 'image', url: IMG('walk') }],
        },
      },
      {
        roomId: 'r2d',
        roomName: '성장일기',
        latestPost: {
          id: 'x4',
          content: '오늘도 잘 자랐다',
          created_at: new Date(Date.now() - 10800_000).toISOString(),
          media: [{ type: 'image', url: IMG('grow') }],
        },
      },
    ],
  },
  {
    neighborId: 'rec2',
    houseId: 'h-vn',
    title: '베트남집',
    langFlag: '🇻🇳',
    coverUrl: IMG('yard2'),
    rooms: [
      {
        roomId: 'r3',
        roomName: '일상',
        latestPost: MOCK_NEIGHBOR_FEED[1],
      },
    ],
  },
]

const MOCK_RELATIONS: YardRelationRow[] = [
  {
    id: 'rel1',
    status: 'pending',
    direction: 'incoming',
    title: '민수네',
    houseId: 'h-min',
  },
  {
    id: 'rel2',
    status: 'pending',
    direction: 'outgoing',
    title: '바다쪽 집',
    houseId: 'h-sea',
  },
  {
    id: 'rel3',
    status: 'accepted',
    direction: 'incoming',
    title: '비단이네',
    houseId: 'h-silk',
  },
]

const MOCK_DISCOVERIES: DiscoveryItem[] = [
  { id: 'd1', label: '🌱 하준이 성장일기 씨앗이 기다리고 있어요' },
  { id: 'd2', label: '💬 번역이 필요한 이웃 글이 있어요' },
]

export default function MockupYardPage() {
  const router = useRouter()
  const [cardCount, setCardCount] = useState<1 | 2 | 3 | 4>(2)
  const [interestIds, setInterestIds] = useState<string[]>(['p1'])
  const [discoveries, setDiscoveries] = useState(MOCK_DISCOVERIES)
  const [fullSections, setFullSections] = useState(true)

  const myPosts = useMemo(() => ALL_MY_POSTS.slice(0, cardCount), [cardCount])

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
          { key: 'back', emoji: '×', label: '닫기', onClick: () => router.push('/') },
        ]}
      />

      <div style={styles.toolbar}>
        <span style={styles.toolbarLabel}>내 방 카드</span>
        {([1, 2, 3, 4] as const).map((n) => (
          <button
            key={n}
            type="button"
            style={{
              ...styles.chip,
              ...(cardCount === n ? styles.chipOn : null),
            }}
            onClick={() => setCardCount(n)}
          >
            {n}개
          </button>
        ))}
        <button
          type="button"
          style={{
            ...styles.chip,
            ...(fullSections ? styles.chipOn : null),
            marginLeft: 'auto',
          }}
          onClick={() => setFullSections((v) => !v)}
        >
          {fullSections ? '전체 구간 ON' : '전체 구간 OFF'}
        </button>
      </div>

      <YardBlock
        loading={false}
        background={{
          gradient: 'linear-gradient(155deg, #17271f 0%, #314a3b 38%, #809b75 72%, #d7d8b7 100%)',
        }}
        ring={MOCK_RING}
        avatar={<span style={{ fontSize: 25 }}>🏡</span>}
        doorplate={{
          langFlag: '🇰🇷',
          title: '여리 ♥ THI THI',
          description: '여리와 티의 공간',
          since: '2026.08.07 부터',
          roomCount: 5,
          neighborCount: 1,
        }}
        discoveries={fullSections ? discoveries : []}
        onDiscoveryDismiss={(id) =>
          setDiscoveries((current) => current.filter((item) => item.id !== id))
        }
        recommended={fullSections ? MOCK_RECOMMENDED : []}
        relations={fullSections ? MOCK_RELATIONS : []}
        neighborFeed={fullSections ? MOCK_NEIGHBOR_FEED : []}
        myPosts={myPosts}
        onPostClick={() => undefined}
        onCommentClick={() => undefined}
        showInterest
        getInterestState={(postId) => (interestIds.includes(postId) ? 'active' : 'none')}
        onInterestClick={toggleInterest}
        onInterestGoLibrary={() => undefined}
        enableInlineComment
        ownerKey="mock-owner"
      />

      <div style={styles.note}>
        <span style={styles.noteDot} />
        <span>
          골목=활동 방 전부(화면2+점) · 이웃/내방=최대3 · 카드 {cardCount}개
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    borderBottom: '1px solid rgba(92,61,46,0.08)',
    background: '#FEFCF8',
    flexWrap: 'wrap',
  },
  toolbarLabel: {
    fontSize: 11,
    color: '#9A8470',
    marginRight: 4,
  },
  chip: {
    border: '1px solid rgba(92,61,46,0.15)',
    background: '#fff',
    color: '#5C4A35',
    fontSize: 12,
    padding: '5px 10px',
    borderRadius: 999,
    cursor: 'pointer',
  },
  chipOn: {
    background: '#2C1810',
    color: '#FEFCF8',
    borderColor: '#2C1810',
  },
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
