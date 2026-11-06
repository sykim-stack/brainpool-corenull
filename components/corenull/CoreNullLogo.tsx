// components/corenull/CoreNullLogo.tsx
// CORENULL 워드마크 — N 모스 (− ·) 는 NULL의 N 바로 아래
// CoreRing R 모스(· − ·) 규칙과 동일

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
  const dashW = size === 'sm' ? 8 : 11
  const dot = size === 'sm' ? 2.5 : 3.5
  const gap = size === 'sm' ? 2.5 : 3.5
  const morseTop = size === 'sm' ? 2 : 3

  const word = variant === 'onDark' ? '#F5F0E8' : '#2C1810'
  const accent = '#F5C518'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
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
        CORE
      </span>
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          fontSize,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: word,
          textTransform: 'uppercase' as const,
        }}
      >
        {/* N + 모스 (− ·) */}
        <span style={{ position: 'relative', display: 'inline-block' }}>
          N
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: `calc(100% + ${morseTop}px)`,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap,
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
        ULL
      </span>
    </span>
  )
}
