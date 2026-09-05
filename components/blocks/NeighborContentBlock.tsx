'use client'

// ─────────────────────────────────────────────────────────────
// NeighborContentBlock — 골목(마당)/복도(거실) 공용 블록.
//
// ADR-ACCESS-002 §1-2 기준: 이 블록이 보여주는 건 "이웃 목록 +
// 그 이웃의 마당으로 들어가는 입구"뿐이다. 활동 피드는 의도적으로
// 넣지 않는다 — 나중에 필요해져도 별도 결정을 거쳐야 한다.
//
// tier는 라벨(골목/복도)만 바꾼다. Neighbor 관계 자체는 House
// 단위이고 tier가 없다(§1-3: Neighbor ≠ Access 권한) — 그래서
// 이 컴포넌트는 neighbors 배열을 필터링하지 않고 받은 그대로
// 그린다. accepted 관계는 어느 화면에서 보든 전부 동일한 이웃이다.
//
// fetch 없음. 호출부(YardBlock/LivingBlock → 페이지)가
// accepted 상태만 걸러서 내려준다.
// ─────────────────────────────────────────────────────────────

export interface NeighborChip {
  neighborId: string  // corenull_neighbors.id
  houseId: string      // 상대방 house id — 입구 이동에 사용
  title: string
  langFlag?: string
}

export interface NeighborContentBlockProps {
  tier: 'public' | 'invite' // 'public' → 골목(마당), 'invite' → 복도(거실)
  neighbors: NeighborChip[]
  onNeighborClick: (houseId: string) => void
}

const TIER_LABEL: Record<NeighborContentBlockProps['tier'], string> = {
  public: '골목',
  invite: '복도',
}

export default function NeighborContentBlock({
  tier,
  neighbors,
  onNeighborClick,
}: NeighborContentBlockProps) {
  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{TIER_LABEL[tier]}</span>
        {neighbors.length > 0 && <span style={styles.count}>{neighbors.length}</span>}
      </div>

      {neighbors.length === 0 ? (
        <div style={styles.empty}>아직 이웃이 없어요</div>
      ) : (
        <div style={styles.scrollRow}>
          {neighbors.map((n) => (
            <button
              key={n.neighborId}
              style={styles.item}
              onClick={() => onNeighborClick(n.houseId)}
            >
              <div style={styles.avatar}>{n.langFlag || '🏡'}</div>
              <span style={styles.name}>{n.title}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    color: '#9A8470',
    letterSpacing: '0.5px',
  },
  count: {
    fontSize: 11,
    color: '#C17F3C',
    background: 'rgba(193,127,60,0.1)',
    borderRadius: 10,
    padding: '1px 6px',
  },
  empty: {
    textAlign: 'center',
    padding: '24px 16px',
    fontSize: 13,
    color: '#9A8470',
    background: '#FEFCF8',
    borderRadius: 14,
    border: '1px dashed rgba(92,61,46,0.15)',
  },
  scrollRow: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    width: 64,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #5C3D2E, #C17F3C)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
  },
  name: {
    fontSize: 11,
    color: '#5C4A35',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
}