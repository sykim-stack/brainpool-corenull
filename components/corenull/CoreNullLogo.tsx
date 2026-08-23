// components/corenull/CoreNullLogo.tsx
export default function CoreNullLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const fontSize = size === 'sm' ? 16 : 22

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', fontFamily: 'sans-serif' }}>
      <span style={{ fontSize, fontWeight: 800, letterSpacing: '0.5px', color: '#2C1810' }}>
        CORE
      </span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={{ fontSize, fontWeight: 800, letterSpacing: '0.5px', color: '#C17F3C' }}>
          N
          <span style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '50%',
              bottom: size === 'sm' ? -11 : -14,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: size === 'sm' ? 2 : 3,
            }}>
              <span style={{
                width: size === 'sm' ? 6 : 8,
                height: size === 'sm' ? 2.5 : 3,
                borderRadius: 1.5,
                background: '#C17F3C',
                display: 'inline-block',
              }} />
              <span style={{
                width: size === 'sm' ? 2.5 : 3,
                height: size === 'sm' ? 2.5 : 3,
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