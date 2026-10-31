import type { PostBlockData } from '@/components/blocks/PostBlock'
import type { NeighborChip, NeighborRoomSlot } from '@/components/blocks/NeighborContentBlock'

export interface LivingSampleView {
  corridor: NeighborChip[]
  posts: PostBlockData[]
}

interface SampleRoom {
  id: string
  name: string
  coverUrl: string
  posts: { content: string; mediaUrl?: string }[]
}

interface SampleSet {
  id: string
  rooms: SampleRoom[]
}

// 기존 프로젝트의 복도·골목 이미지를 방 커버·게시글 미디어로만 재사용한다. DB에 쓰지 않는다.
const SAMPLE_SETS: SampleSet[] = [
  {
    id: 'garden',
    rooms: [
      {
        id: 'window-garden',
        name: '창가의 작은 정원',
        coverUrl: '/alley/corridor-01.jpg',
        posts: [
          { content: '오늘 아침, 어제보다 잎이 조금 더 펼쳐졌다.', mediaUrl: '/alley/corridor-01.jpg' },
          { content: '햇빛 드는 자리를 찾아 화분을 옮겼다. 여기서 잘 자라면 좋겠다.', mediaUrl: '/alley/corridor-02.jpg' },
          { content: '새잎이 천천히 올라오는 걸 한참 보고 있었다.', mediaUrl: '/alley/corridor-03.jpg' },
          { content: '물을 주고 창문을 열었다. 방 안 공기도 조금 달라진 느낌.' },
          { content: '처음 피어난 꽃 한 송이를 오늘의 기록으로 남긴다.', mediaUrl: '/alley/corridor-04.jpg' },
        ],
      },
      {
        id: 'garden-notes',
        name: '정원 메모',
        coverUrl: '/alley/corridor-02.jpg',
        posts: [
          { content: '분갈이는 주말에 하기로 했다. 흙과 작은 화분을 준비해야겠다.', mediaUrl: '/alley/corridor-02.jpg' },
          { content: '비가 온 뒤라 흙이 촉촉하다. 오늘은 그냥 지켜보기.', mediaUrl: '/alley/corridor-05.jpg' },
          { content: '작은 변화라도 적어두면 나중에 다시 만날 수 있다.' },
          { content: '잎 끝이 조금 말라서 물 주는 간격을 살펴보는 중.', mediaUrl: '/alley/corridor-01.jpg' },
        ],
      },
      {
        id: 'garden-seasons',
        name: '계절이 오는 자리',
        coverUrl: '/alley/corridor-03.jpg',
        posts: [
          { content: '계절이 바뀌는 건 창가의 빛이 먼저 알려준다.', mediaUrl: '/alley/corridor-03.jpg' },
          { content: '오늘은 화분 사이에 새 자리를 하나 만들었다.', mediaUrl: '/alley/corridor-04.jpg' },
          { content: '작은 정원도 매일 조금씩 다른 표정을 보여준다.' },
          { content: '저녁빛이 잎 위에 오래 머물렀다.', mediaUrl: '/alley/corridor-05.jpg' },
        ],
      },
    ],
  },
  {
    id: 'table',
    rooms: [
      {
        id: 'our-table',
        name: '오늘의 식탁',
        coverUrl: '/alley/corridor-04.jpg',
        posts: [
          { content: '저녁은 있는 재료로 간단하게 차렸다. 같이 먹으니 더 맛있었다.', mediaUrl: '/alley/corridor-04.jpg' },
          { content: '새로 해본 반찬이 생각보다 괜찮아서 다음에도 만들어보기로.', mediaUrl: '/alley/corridor-01.jpg' },
          { content: '오늘 식탁에 오른 것들을 잊기 전에 남겨둔다.' },
          { content: '따뜻한 국 한 그릇으로 하루를 천천히 마무리했다.', mediaUrl: '/alley/corridor-02.jpg' },
          { content: '주말에는 함께 장을 보고 새로운 메뉴를 골라볼 예정.' },
        ],
      },
      {
        id: 'kitchen-notes',
        name: '부엌의 메모',
        coverUrl: '/alley/corridor-05.jpg',
        posts: [
          { content: '다음에는 간을 조금 덜 하고 마지막에 맞춰보기.', mediaUrl: '/alley/corridor-05.jpg' },
          { content: '냉장고에 남은 채소부터 쓰면 좋겠다.', mediaUrl: '/alley/corridor-03.jpg' },
          { content: '오늘의 작은 성공: 설거지를 미루지 않았다.' },
          { content: '레시피는 조금 달라도 우리 입맛에 맞으면 그만.', mediaUrl: '/alley/corridor-01.jpg' },
        ],
      },
      {
        id: 'weekend-market',
        name: '주말 장보기',
        coverUrl: '/alley/corridor-01.jpg',
        posts: [
          { content: '장을 보기 전에 냉장고부터 확인했다. 이번에는 꼭 필요한 것만.', mediaUrl: '/alley/corridor-01.jpg' },
          { content: '시장에 갔다가 제철 과일을 한 봉지 담아왔다.', mediaUrl: '/alley/corridor-02.jpg' },
          { content: '함께 고른 재료로 다음 주 식탁을 채워보자.' },
          { content: '오늘 산 작은 꽃이 식탁을 환하게 만들어준다.', mediaUrl: '/alley/corridor-04.jpg' },
        ],
      },
    ],
  },
  {
    id: 'slowday',
    rooms: [
      {
        id: 'slow-walk',
        name: '천천히 걷는 길',
        coverUrl: '/alley/corridor-02.jpg',
        posts: [
          { content: '오늘은 익숙한 길을 조금 천천히 걸었다.', mediaUrl: '/alley/corridor-02.jpg' },
          { content: '돌아오는 길에 바람이 좋아서 잠깐 더 걷기로 했다.', mediaUrl: '/alley/corridor-03.jpg' },
          { content: '매일 보던 나무에 새순이 돋아 있었다.' },
          { content: '산책을 마치고 마신 물이 유난히 시원했다.', mediaUrl: '/alley/corridor-05.jpg' },
          { content: '다음에는 해가 지기 전에 한 바퀴 더 돌아야겠다.' },
        ],
      },
      {
        id: 'desk-notes',
        name: '책상 위 기록',
        coverUrl: '/alley/corridor-03.jpg',
        posts: [
          { content: '책상 위를 정리하고 오늘 할 일을 하나만 남겨두었다.', mediaUrl: '/alley/corridor-03.jpg' },
          { content: '읽던 페이지에 작은 표시를 해두고 잠시 쉬었다.', mediaUrl: '/alley/corridor-01.jpg' },
          { content: '손에 잡히는 일부터 하나씩 끝내는 날.' },
          { content: '오늘의 생각은 짧게 적고 오래 두기로 했다.', mediaUrl: '/alley/corridor-04.jpg' },
        ],
      },
      {
        id: 'small-things',
        name: '작은 것들',
        coverUrl: '/alley/corridor-04.jpg',
        posts: [
          { content: '별일 없던 하루에서 마음에 남은 장면 하나.', mediaUrl: '/alley/corridor-04.jpg' },
          { content: '창문 너머 구름이 천천히 모양을 바꿨다.', mediaUrl: '/alley/corridor-05.jpg' },
          { content: '좋아하는 찻잔을 꺼내 차를 마셨다.' },
          { content: '나중에 다시 떠올리고 싶은 순간을 적어둔다.', mediaUrl: '/alley/corridor-02.jpg' },
        ],
      },
    ],
  },
]

function stableIndex(ownerKey: string, count: number): number {
  let hash = 2166136261
  for (let i = 0; i < ownerKey.length; i += 1) {
    hash ^= ownerKey.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % count
}

function toPost(
  sampleId: string,
  room: SampleRoom,
  roomIndex: number,
  index: number,
  entry: { content: string; mediaUrl?: string },
  houseName: string,
): PostBlockData {
  return {
    id: `sample-${sampleId}-${room.id}-${index + 1}`,
    content: entry.content,
    media: entry.mediaUrl
      ? [{ type: 'image', url: entry.mediaUrl }]
      : undefined,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 60 - roomIndex * 20 - index)).toISOString(),
    comment_count: 0,
    room_id: `sample-room-${room.id}`,
    isSample: true,
    view_meta: {
      house_name: houseName,
      room_name: room.name,
    },
  }
}

export function createLivingSampleView(ownerKey: string): LivingSampleView {
  const sample = SAMPLE_SETS[stableIndex(`${ownerKey}:living-samples-v1`, SAMPLE_SETS.length)]
  const allPosts: PostBlockData[] = []
  const roomSlots: NeighborRoomSlot[] = sample.rooms.map((room, roomIndex) => {
    const posts = room.posts.map((entry, index) =>
      toPost(sample.id, room, roomIndex, index, entry, '샘플 집'),
    )
    allPosts.push(...posts)
    return {
      roomId: `sample-room-${room.id}`,
      roomName: room.name,
      coverUrl: room.coverUrl,
      latestPost: posts[0] || null,
    }
  })
  allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return {
    corridor: [
      {
        neighborId: `living-sample-${sample.id}`,
        houseId: `living-sample-${sample.id}`,
        title: '샘플 집',
        langFlag: '🏡',
        coverUrl: sample.rooms[0]?.coverUrl,
        rooms: roomSlots,
      },
    ],
    posts: allPosts,
  }
}

/** 마당 골목·이웃공개방·내 방 최신용 샘플 (실데이터 없을 때만) */
export interface YardSampleView {
  recommended: NeighborChip[]
  neighborFeed: PostBlockData[]
  myPosts: PostBlockData[]
}

const YARD_NEIGHBOR_HOUSES = [
  {
    id: 'yard-nb-1',
    title: '느린 오후 집',
    flag: '🌿',
    cover: '/alley/alley-01.jpg',
    rooms: [
      {
        id: 'nb1-r1',
        name: '베란다 기록',
        cover: '/alley/corridor-01.jpg',
        posts: [
          { content: '창밖 바람이 부드러워서 문을 열어두었다.', mediaUrl: '/alley/alley-01.jpg' },
          { content: '화분에 물을 주고 잠시 서 있었다.', mediaUrl: '/alley/corridor-02.jpg' },
        ],
      },
      {
        id: 'nb1-r2',
        name: '저녁 식탁',
        cover: '/alley/corridor-03.jpg',
        posts: [
          { content: '오늘은 간단한 국수. 같이 먹으니 충분했다.', mediaUrl: '/alley/alley-02.jpg' },
        ],
      },
    ],
  },
  {
    id: 'yard-nb-2',
    title: '골목 끝 집',
    flag: '🏠',
    cover: '/alley/alley-03.jpg',
    rooms: [
      {
        id: 'nb2-r1',
        name: '산책 메모',
        cover: '/alley/corridor-04.jpg',
        posts: [
          { content: '익숙한 골목을 한 바퀴 돌고 왔다.', mediaUrl: '/alley/alley-03.jpg' },
          { content: '담장 너머 꽃이 조금 피어 있었다.', mediaUrl: '/alley/corridor-05.jpg' },
        ],
      },
      {
        id: 'nb2-r2',
        name: '작은 창',
        cover: '/alley/corridor-02.jpg',
        posts: [
          { content: '해가 지는 쪽 창에 잠깐 앉아 있었다.', mediaUrl: '/alley/alley-04.jpg' },
        ],
      },
    ],
  },
  {
    id: 'yard-nb-3',
    title: '따뜻한 문패',
    flag: '☕',
    cover: '/alley/alley-05.jpg',
    rooms: [
      {
        id: 'nb3-r1',
        name: '아침 차',
        cover: '/alley/corridor-05.jpg',
        posts: [
          { content: '첫 잔을 마시고 오늘 할 일을 적었다.', mediaUrl: '/alley/alley-05.jpg' },
        ],
      },
      {
        id: 'nb3-r2',
        name: '주말 장보기',
        cover: '/alley/corridor-01.jpg',
        posts: [
          { content: '시장에서 제철 채소를 담아 왔다.', mediaUrl: '/alley/corridor-01.jpg' },
          { content: '집에 돌아와 냉장고를 정리했다.', mediaUrl: '/alley/corridor-03.jpg' },
        ],
      },
    ],
  },
]

export function createYardSampleView(ownerKey: string): YardSampleView {
  const seed = stableIndex(`${ownerKey}:yard-samples-v1`, 3)
  const houses = [
    YARD_NEIGHBOR_HOUSES[seed % YARD_NEIGHBOR_HOUSES.length],
    YARD_NEIGHBOR_HOUSES[(seed + 1) % YARD_NEIGHBOR_HOUSES.length],
    YARD_NEIGHBOR_HOUSES[(seed + 2) % YARD_NEIGHBOR_HOUSES.length],
  ]

  const recommended: NeighborChip[] = houses.map((h) => {
    const rooms: NeighborRoomSlot[] = h.rooms.map((room, ri) => {
      const posts = room.posts.map((entry, pi) =>
        toPost(
          h.id,
          { id: room.id, name: room.name, coverUrl: room.cover, posts: room.posts },
          ri,
          pi,
          entry,
          h.title,
        ),
      )
      return {
        roomId: `sample-room-${room.id}`,
        roomName: room.name,
        coverUrl: room.cover,
        latestPost: posts[0] || null,
      }
    })
    return {
      neighborId: `yard-sample-${h.id}`,
      houseId: `yard-sample-${h.id}`,
      title: h.title,
      langFlag: h.flag,
      coverUrl: h.cover,
      rooms,
      requestPending: false,
    }
  })

  const neighborFeed: PostBlockData[] = []
  for (const chip of recommended) {
    for (const room of chip.rooms || []) {
      if (room.latestPost) {
        neighborFeed.push({
          ...room.latestPost,
          view_meta: {
            ...room.latestPost.view_meta,
            relation: '이웃',
            status: '이웃공개',
          },
        })
      }
    }
  }
  neighborFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const living = createLivingSampleView(ownerKey)
  const myPosts = (living.corridor[0]?.rooms || [])
    .map((r) => r.latestPost)
    .filter(Boolean) as PostBlockData[]

  return {
    recommended,
    neighborFeed: neighborFeed.slice(0, 12),
    myPosts,
  }
}
