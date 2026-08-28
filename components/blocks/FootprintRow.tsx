'use client'

// ─────────────────────────────────────────────────────────────
// FootprintRow — 발자취 전용 독립 블록.
//
// PostBlock의 변형이 아니다. 시각적 밀도는 Compact Post와 닮을 수
// 있지만 데이터 의미는 완전히 다르다.
//
//   PostBlock     = 무엇을 남겼는가 (내용/작성자/이미지/관심)
//   FootprintRow  = 어디를 다녀왔는가 (House/Room/시간, 그뿐)
//
// House가 기억의 기준점, Room은 세부 위치 — House 없이 Room만
// 보여주면 "어느 집인지" 사용자가 다시 추측해야 하는 문제가 있었다.
// 그래서 House 이름을 주 정보로, Room+시간을 부 정보로 둔다.
//
// MVP 3개뿐: House 이름 / Room 이름+방문시간 / 행 전체 클릭 이동.
// 여기에 뱃지나 메타데이터를 더 붙이지 않는다 — 그건 이 블록의
// 역할이 아니다 (필요하면 그건 PostBlock 쪽 이야기다).
// ─────────────────────────────────────────────────────────────

export interface FootprintData {
  id: string
  house_name: string | null // null이면 '알 수 없는 집' 등으로 폴백 표시
  room_name: string | null
  visited_at: string
}

export interface FootprintRowProps {
  footprint: FootprintData
  onClick?: () => void
}

function formatVisitedAt(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function FootprintRow({ footprint, onClick }: FootprintRowProps) {
  return (
    <div style={styles.row} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div style={styles.icon}>🏡</div>
      <div style={styles.info}>
        <div style={styles.houseName}>{footprint.house_name || '알 수 없는 집'}</div>
        <div style={styles.sub}>
          {footprint.room_name || '방'} · {formatVisitedAt(footprint.visited_at)}
        </div>
      </div>
      <span style={styles.arrow}>›</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    background: '#FEFCF8',
    borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(74,82,64,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  houseName: {
    fontSize: 13.5,
    fontWeight: 500,
    color: '#1C1208',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sub: {
    fontSize: 11,
    color: '#9A8470',
    marginTop: 2,
  },
  arrow: { fontSize: 16, color: '#9A8470', flexShrink: 0 },
}