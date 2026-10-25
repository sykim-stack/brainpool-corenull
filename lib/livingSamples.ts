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
  badges: string[]
  posts: string[]
  postImages: string[]
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
        badges: ['🌱 씨앗', '🪴 돌보기'],
        postImages: ['/samples/garden-window.png', '/samples/seasonal-tree.png'],
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
        badges: ['🌱 씨앗', '📝 기록'],
        postImages: ['/samples/desk-notes.png'],
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
        badges: ['🌿 자라는 중', '💬 대화'],
        postImages: ['/samples/seasonal-tree.png', '/samples/garden-window.png'],
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
        badges: ['🤝 함께 참여', '🍽️ 같이 만들기'],
        postImages: ['/samples/shared-table.png', '/samples/everyday-together.png'],
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
        badges: ['🤝 함께 참여', '📝 기록'],
        postImages: ['/samples/desk-notes.png'],
        posts: [
          '다음에는 간을 조금 덜 하고 마지막에 맞춰보기.',
          '냉장고에 남은 채소부터 쓰면 좋겠다.',
          '오늘의 작은 성공: 설거지를 미루지 않았다.',
          '레시피는 조금 달라도 우리 입맛에 맞으면 그만.',
        ],
      },
      {
        id: 'weekend-market',
        name: '주말 장보기',
        coverUrl: '/alley/corridor-01.jpg',
        badges: ['🤝 함께 참여', '🌱 다음 계획'],
        postImages: ['/samples/everyday-together.png', '/samples/shared-table.png'],
        posts: [
          '장을 보기 전에 냉장고부터 확인했다. 이번에는 꼭 필요한 것만.',
          '시장에 갔다가 제철 과일을 한 봉지 담아왔다.',
          '함께 고른 재료로 다음 주 식탁을 채워보자.',
          '오늘 산 작은 꽃이 식탁을 환하게 만들어준다.',
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
        badges: ['🌱 이어쓰기', '💬 대화'],
        postImages: ['/samples/slow-walk.png', '/samples/seasonal-tree.png'],
        posts: [
          '오늘은 익숙한 길을 조금 천천히 걸었다.',
          '돌아오는 길에 바람이 좋아서 잠깐 더 걷기로 했다.',
          '매일 보던 나무에 새순이 돋아 있었다.',
          '산책을 마치고 마신 물이 유난히 시원했다.',
          '다음에는 해가 지기 전에 한 바퀴 더 돌아야겠다.',
        ],
      },
      {
        id: 'desk-notes',
        name: '책상 위 기록',
        coverUrl: '/alley/corridor-03.jpg',
        badges: ['🌱 이어쓰기', '💬 댓글 대화'],
        postImages: ['/samples/desk-notes.png'],
        posts: [
          '책상 위를 정리하고 오늘 할 일을 하나만 남겨두었다.',
          '읽던 페이지에 작은 표시를 해두고 잠시 쉬었다.',
          '손에 잡히는 일부터 하나씩 끝내는 날.',
          '오늘의 생각은 짧게 적고 오래 두기로 했다.',
        ],
      },
      {
        id: 'small-things',
        name: '작은 것들',
        coverUrl: '/alley/corridor-04.jpg',
        badges: ['💬 댓글 대화', '🤝 함께 나누기'],
        postImages: ['/samples/garden-window.png', '/samples/seasonal-tree.png'],
        posts: [
          '별일 없던 하루에서 마음에 남은 장면 하나.',
          '창문 너머 구름이 천천히 모양을 바꿨다.',
          '좋아하는 찻잔을 꺼내 차를 마셨다.',
          '나중에 다시 떠올리고 싶은 순간을 적어둔다.',
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

export function createLivingSampleView(ownerKey: string): LivingSampleView {
  const sample = SAMPLE_SETS[stableIndex(`${ownerKey}:living-samples-v1`, SAMPLE_SETS.length)]
  const allPosts: PostBlockData[] = []
  const roomSlots: NeighborRoomSlot[] = sample.rooms.map((room, roomIndex) => {
    const posts = room.posts.map((content, index): PostBlockData => ({
      id: `sample-${sample.id}-${room.id}-${index + 1}`,
      content,
      media: room.postImages[index % room.postImages.length]
        ? [{ type: 'image', url: room.postImages[index % room.postImages.length] }]
        : undefined,
      // 화면에서는 실제 날짜 대신 '샘플 게시글'로 표시하며, 정렬 용도로만 고정 시각을 쓴다.
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 60 - roomIndex * 20 - index)).toISOString(),
      comment_count: 2,
      room_id: `sample-room-${room.id}`,
      isSample: true,
      sampleBadges: room.badges,
      sampleCommentCount: 2,
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
