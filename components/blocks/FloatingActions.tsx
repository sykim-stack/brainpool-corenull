'use client'

import { useRouter } from 'next/navigation'

export default function FloatingActions() {
  const router = useRouter()

  return (
    <div className="app-fixed-bar" style={{
      bottom: 0,
      zIndex: 150,
      pointerEvents: 'none',
    }}>
      <button
        onClick={() => router.push('/write')}
        aria-label="글쓰기"
        className="app-fab-primary"
        style={{
          position: 'absolute',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          background: '#2C1810',
          border: 'none',
          fontSize: '24px',
          color: '#FBF8F2',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(44, 24, 16, 0.35)',
          pointerEvents: 'auto',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ✏️
      </button>

      <button
        onClick={() => router.push('/me')}
        aria-label="내정보"
        className="app-fab-secondary"
        style={{
          position: 'absolute',
          right: '16px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#FEFCF8',
          border: '1px solid rgba(92, 61, 46, 0.12)',
          fontSize: '18px',
          color: '#2C1810',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(44, 24, 16, 0.18)',
          pointerEvents: 'auto',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        👤
      </button>
    </div>
  )
}