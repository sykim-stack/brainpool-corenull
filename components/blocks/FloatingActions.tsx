'use client'

import { useRouter } from 'next/navigation'

// 글쓰기 — 화면 오른쪽 세로 중앙. me는 TopBar 오른쪽.
export default function FloatingActions() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/write')}
      aria-label="글쓰기"
      style={{
        position: 'fixed',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
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
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      ✏️
    </button>
  )
}
