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
  posts: string[]
}

interface SampleSet {
  id: string
  rooms: SampleRoom[]
}

// 기존 프로젝트의 복도 이미지를 방 커버로만 재사용한다. 게시글 데이터는 DB에 쓰지 않는다.
const SAMPLE_SETS: SampleSet[] = [
  {
    id: 'garden',
    rooms: [
      {
        id: 'window-garden',
        name: '창가의 작은 정원',
        coverUrl: '/alley/corridor-01.jpg',
        posts: [
          '오늘 아침, 어제보다 잎이 조금 더 펼쳐졌다.',
          '햇빛 드는 자리를 찾아 화분을 옮겼다. 여기서 잘 자라면 좋겠다.',
          '새잎이 천천히 올라오는 걸 한참 보고 있었다.',
          '물을 주고 창문을 열었다. 방 안 공기도 조금 달라진 느낌.',
          '처음 피어난 꽃 한 송이를 오늘의 기록으로 남긴다.',
        ],
      },
      {
        id: 'garden-notes',
        name: '정원 메모',
        coverUrl: '/alley/corridor-02.jpg',
        posts: [
          '분갈이는 주말에 하기로 했다. 흙과 작은 화분을 준비해야겠다.',
          '비가 온 뒤라 흙이 촉촉하다. 오늘은 그냥 지켜보기.',
          '작은 변화라도 적어두면 나중에 다시 만날 수 있다.',
          '잎 끝이 조금 말라서 물 주는 간격을 살펴보는 중.',
        ],
      },
      {
        id: 'garden-seasons',
        name: '계절이 오는 자리',
        coverUrl: '/alley/corridor-03.jpg',
        posts: [
          '계절이 바뀌는 건 창가의 빛이 먼저 알려준다.',
          '오늘은 화분 사이에 새 자리를 하나 만들었다.',
          '작은 정원도 매일 조금씩 다른 표정을 보여준다.',
          '저녁빛이 잎 위에 오래 머물렀다.',
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
          '저녁은 있는 재료로 간단하게 차렸다. 같이 먹으니 더 맛있었다.',
          '새로 해본 반찬이 생각보다 괜찮아서 다음에도 만들어보기로.',
          '오늘 식탁에 오른 것들을 잊기 전에 남겨둔다.',
          '따뜻한 국 한 그릇으로 하루를 천천히 마무리했다.',
          '주말에는 함께 장을 보고 새로운 메뉴를 골라볼 예정.',
        ],
      },
      {
        id: 'kitchen-notes',
        name: '부엌의 메모',
        coverUrl: '/alley/corridor-05.jpg',
        posts: [
          '장보기 목록을 적어두니 덜 헤매고 필요한 것만 사게 된다.',
          '남은 재료로 만든 점심이 의외로 괜찮았다.',
          '설거지를 마치면 부엌이 다시 고요해진다.',
          '향신료 자리를 정리하니 요리할 마음이 난다.',
        ],
      },
      {
        id: 'shared-meal',
        name: '같이 먹는 시간',
        coverUrl: '/alley/corridor-01.jpg',
        posts: [
          '오늘 식탁에는 이야기가 더 많았다.',
          '간단한 음식이어도 함께면 충분하다.',
          '다음엔 당신이 좋아하는 메뉴로 준비해볼게.',
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
          '오늘은 익숙한 길을 조금 천천히 걸었다.',
          '바람이 불 때마다 나뭇잎 소리가 달라진다.',
          '걸음을 늦추니 보이는 것들이 늘어난다.',
          '같은 골목도 시간에 따라 표정이 바뀐다.',
        ],
      },
      {
        id: 'desk-notes',
        name: '책상 위 기록',
        coverUrl: '/alley/corridor-03.jpg',
        posts: [
          '책상 위를 정리하고 오늘 할 일을 하나만 남겨두었다.',
          '열린 페이지에 적은 표시를 해두고 잠시 쉬었다.',
          '창밖의 빛이 노트 위를 천천히 지나간다.',
        ],
      },
      {
        id: 'small-things',
        name: '작은 것들',
        coverUrl: '/alley/corridor-04.jpg',
        posts: [
          '사소해 보이는 순간도 기록해 두면 다시 만난다.',
          '오늘의 작은 행복을 한 줄로 적었다.',
          '손에 잡히는 일부터 하나씩 끝내는 날.',
        ],
      },
    ],
  },
]

function stableIndex(seed: string, count: number): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % count
}

export function createLivingSampleView(ownerKey: string): LivingSampleView {
  const sample = SAMPLE_SETS[stableIndex(`${ownerKey}:living-samples-v1`, SAMPLE_SETS.length)]
  const allPosts: PostBlockData[] = []
  let sampleImageIndex = 0
  const sampleImageCount = sample.id === 'slowday' ? 12 : 6
  const roomSlots: NeighborRoomSlot[] = sample.rooms.map((room, roomIndex) => {
    const posts = room.posts.map((content, index): PostBlockData => ({
      id: `sample-${sample.id}-${room.id}-${index + 1}`,
      content,
      // 샘플 게시물은 빈집의 분위기를 보여주는 화면 전용 이미지로 채운다.
      media: [{ type: 'image', url: `/samples/${sample.id}-${String((sampleImageIndex++ % sampleImageCount) + 1).padStart(2, '0')}.jpg` }],
      // 화면에서는 실제 날짜 대신 '샘플 게시글'로 표시하며, 정렬 용도로만 고정 시각을 쓴다.
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 60 - roomIndex * 20 - index)).toISOString(),
      comment_count: 0,
      room_id: `sample-room-${room.id}`,
      isSample: true,
      view_meta: {
        house_name: '샘플 집',
        room_name: room.name,
      },
    }))
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

export interface YardSampleView {
  recommended: NeighborChip[]
  neighborFeed: PostBlockData[]
  myPosts: PostBlockData[]
}

/** 마당 빈집(첫 접속)용 화면 전용 샘플. DB에 쓰지 않는다. */
export function createYardSampleView(ownerKey: string): YardSampleView {
  const living = createLivingSampleView(ownerKey)
  const samplePosts = living.posts

  const recommended: NeighborChip[] = living.corridor.map((chip, i) => ({
    ...chip,
    neighborId: `yard-sample-nb-${i}`,
    houseId: `yard-sample-house-${i}`,
    title: i === 0 ? '옆집의 오후' : chip.title,
    langFlag: i === 0 ? '🏡' : chip.langFlag || '🏡',
    coverUrl: chip.coverUrl || `/alley/alley-0${(i % 5) + 1}.jpg`,
  }))

  if (recommended.length === 1) {
    const extraRooms = living.corridor[0]?.rooms?.slice().reverse() || []
    recommended.push({
      neighborId: 'yard-sample-nb-1',
      houseId: 'yard-sample-house-1',
      title: '골목 끝 집',
      langFlag: '🌿',
      coverUrl: '/alley/alley-02.jpg',
      rooms: extraRooms.map((r, idx) => ({
        ...r,
        roomId: `yard-sample-room-extra-${idx}`,
      })),
    })
  }

  const neighborFeed = samplePosts.slice(0, 8).map((p, i) => ({
    ...p,
    id: `yard-sample-nb-feed-${i}`,
    isSample: true,
    view_meta: {
      ...(p.view_meta || {}),
      house_name: p.view_meta?.house_name || '이웃 샘플',
      relation: '이웃',
    },
  }))

  const myPosts = samplePosts.slice(0, 6).map((p, i) => ({
    ...p,
    id: `yard-sample-my-${i}`,
    isSample: true,
    view_meta: {
      ...(p.view_meta || {}),
      house_name: '나의 샘플 집',
      relation: '나',
    },
  }))

  return { recommended, neighborFeed, myPosts }
}
