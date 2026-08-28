'use client'

// ─────────────────────────────────────────────────────────────
// RingBlock — House의 나이테(성장 흔적)를 동심원으로 표현.
//
// 계약(ADR-RINGBLOCK-000):
//   - 입력은 RingData(rings: [{ index, weight }]) 뿐이다.
//   - weight의 "의미"(House 정적 데이터로 계산했든, 향후 CoreHub
//     가중치로 계산했든)는 이 컴포넌트가 알 필요도 관심도 없다.
//     계산 로직을 여기 넣지 않는다 — 그게 유일한 절대 규칙.
//   - meta 필드는 계약에 없다. 디버그용으로 붙어 들어와도
//     렌더링/클릭/라우팅에 영향을 주면 안 되므로 아예 읽지 않는다.
//
// 중앙 아바타(House 아이콘/이미지)를 감싸는 동심원 형태 — Hero 배경과
// 정보 영역(Doorplate) 경계선에 절반씩 걸치는 배치는 HeroBlock 쪽
// 레이아웃 책임이고, RingBlock 자체는 "동심원 SVG를 그린다"만 한다.
// ─────────────────────────────────────────────────────────────

export interface RingDatum {
  index: number   // 몇 번째 나이테인지 (0 = 가장 안쪽)
  weight: number   // 0~1 정규화된 값. 정규화 자체도 계산 레이어의 책임.
}

export interface RingData {
  rings: RingDatum[]
}

export interface RingBlockProps {
  data: RingData
  size?: number        // 전체 SVG 한 변 길이(px). 기본 160
  centerContent?: React.ReactNode // 중앙에 얹을 아바타/아이콘
  color?: string        // 링 색상. 기본 CoreNull 그린 톤
}

const DEFAULT_SIZE = 160
const DEFAULT_COLOR = '#4A7C3F'

export default function RingBlock({
  data,
  size = DEFAULT_SIZE,
  centerContent,
  color = DEFAULT_COLOR,
}: RingBlockProps) {
  const rings = [...data.rings].sort((a, b) => a.index - b.index)
  const center = size / 2
  const maxRadius = size / 2
  const minRadius = size * 0.28 // 중앙 아바타 자리 확보
  const ringCount = Math.max(rings.length, 1)
  const step = (maxRadius - minRadius) / ringCount

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {rings.map((ring, i) => {
          const radius = minRadius + step * (i + 1)
          const weight = Math.min(Math.max(ring.weight, 0), 1)
          return (
            <circle
              key={ring.index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.15 + weight * 0.55}
            />
          )
        })}
      </svg>

      {centerContent && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: minRadius * 2 - 8,
            height: minRadius * 2 - 8,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FEFCF8',
            border: `2px solid ${color}`,
            boxShadow: '0 2px 12px rgba(44,24,16,0.12)',
          }}
        >
          {centerContent}
        </div>
      )}
    </div>
  )
}