'use client'

import { useRouter } from 'next/navigation'

// 글쓰기 FAB — 하단 중앙.
// 나(me)는 TopBar 오른쪽으로 이동.
export default function FloatingActions() {
  const router = useRouter()

  return (
    <div
      className="app-fixed-bar"
      style={{
        bottom: 0,
        zIndex: 150,
        pointerEvents: 'none',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        onClick={() => router.push('/write')}
        aria-label="글쓰기"
        className="app-fab-write"
        style={{
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
          // 하단 탭바 위로 살짝 올림
          marginBottom: '72px',
        }}
      >
        ✏️
      </button>
    </div>
  )
}
