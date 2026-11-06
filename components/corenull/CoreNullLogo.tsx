// components/corenull/CoreNullLogo.tsx
// CORENULL 워드마크 + N 모스 (− ·)
// CoreRing이 R 모스(· − ·)를 쓰는 것과 같은 규칙

export type CoreNullLogoVariant = 'onLight' | 'onDark'

export default function CoreNullLogo({
  size = 'sm',
  variant = 'onDark',
}: {
  size?: 'sm' | 'md'
  /** onDark = 다크 탑바용 (기본). onLight = 크림 배경용 */
  variant?: CoreNullLogoVariant
}) {
  const fontSize = size === 'sm' ? 13 : 17
  const dashW = size === 'sm' ? 9 : 12
  const dot = size === 'sm' ? 3 : 4
  const gap = size === 'sm' ? 3 : 4

  const word = variant === 'onDark' ? '#F5F0E8' : '#2C1810'
  // Ring 액센트에 맞춘 포인트 (모스)
  const accent = '#F5C518'

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: size === 'sm' ? 3 : 4,
        lineHeight: 1,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
      aria-label="CoreNull"
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: word,
          textTransform: 'uppercase' as const,
        }}
      >
        CORENULL
      </span>
      {/* N = − · */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap,
          height: dot,
          paddingLeft: 1,
        }}
        aria-hidden
      >
        <span
          style={{
            width: dashW,
            height: Math.max(2, Math.round(dot * 0.55)),
            borderRadius: 1,
            background: accent,
            display: 'inline-block',
          }}
        />
        <span
          style={{
            width: dot,
            height: dot,
            borderRadius: '50%',
            background: accent,
            display: 'inline-block',
          }}
        />
      </span>
    </span>
  )
}
