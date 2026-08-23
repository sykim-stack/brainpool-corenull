// components/corenull/CoreNullLogo.tsx
export default function CoreNullLogo({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const fontSize = size === 'sm' ? 14 : 18

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', fontFamily: 'sans-serif' }}>
      <span style={{ fontSize, fontWeight: 800, letterSpacing: '0.3px', color: '#2C1810' }}>
        CORE
      </span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={{ fontSize, fontWeight: 800, letterSpacing: '0.3px', color: '#C17F3C' }}>
          N
          <span style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '50%',
              bottom: -4,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}>
              <span style={{
                width: 4,
                height: 1.5,
                borderRadius: 0.75,
                background: '#C17F3C',
                display: 'inline-block',
              }} />
              <span style={{
                width: 1.5,
                height: 1.5,
                borderRadius: '50%',
                background: '#C17F3C',
                display: 'inline-block',
              }} />
            </span>
          </span>
          ULL
        </span>
      </span>
    </span>
  )
}