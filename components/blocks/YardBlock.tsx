'use client'

import HeroBlock, { HeroBackground, HeroDoorplate } from './HeroBlock'
import MyContentBlock from './MyContentBlock'
import { RingData } from './RingBlock'
import { PostBlockData } from './PostBlock'

// ─────────────────────────────────────────────────────────────
// YardBlock — 마당 화면 전체를 조립하는 블록.
//
// §2(마당 Block 구성) 기준:
//   HeroBlock (배경=외부) + Ring + Doorplate
//   MyContentBlock (내 방 최신 콘텐츠)
//   NeighborContentBlock (골목, public tier) — 자리만, OFF
//
// NeighborContentBlock은 실제로 만들지도, import하지도 않는다.
// ADR-ACCESS-002가 없는 상태(404 확인됨)에서 골목을 render하면
// ADR-NEIGHBOR-000 §5 게이트("formal 승인 전까지 코드로 옮기지
// 않는다")를 우리 스스로 어기는 것이 된다. 승인 나면 이 자리에
// NeighborContentBlock 컴포넌트 하나만 꽂으면 되도록 빈 슬롯만 둔다.
//
// 이 블록은 "마당 페이지" 그 자체이므로 데이터 로딩 책임을 진다
// (HeroBlock/MyContentBlock 자체는 여전히 fetch하지 않는 순수
// 컴포넌트다 — 여기서 가져온 데이터를 props로 내려줄 뿐).
// ─────────────────────────────────────────────────────────────

export interface YardBlockProps {
  background: HeroBackground
  ring: RingData
  avatar?: React.ReactNode
  doorplate: HeroDoorplate
  posts: PostBlockData[]
  onPostClick?: (postId: string) => void
  onCommentClick?: (postId: string) => void
  loading?: boolean
}

export default function YardBlock({
  background,
  ring,
  avatar,
  doorplate,
  posts,
  onPostClick,
  onCommentClick,
  loading = false,
}: YardBlockProps) {
  if (loading) {
    return <div style={styles.loading}>🌳</div>
  }

  return (
    <div>
      <HeroBlock background={background} ring={ring} avatar={avatar} doorplate={doorplate} />

      <MyContentBlock
        title="내 방 최신 콘텐츠"
        posts={posts}
        onPostClick={onPostClick}
        onCommentClick={onCommentClick}
      />

      {/*
        NeighborContentBlock 자리 — ADR-ACCESS-002 승인 전까지 OFF.
        게이트 풀리면 여기에 <NeighborContentBlock tier="public" .../> 하나만 추가.
      */}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    fontSize: 40,
  },
}