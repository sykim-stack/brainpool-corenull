'use client'

import { usePathname, useRouter } from 'next/navigation'

// 기본 탭바 — 항상 최하단, 3개 고정 (§7: 글쓰기·내정보는 FloatingActions로 분리)
const TABS = [
  { id: 'home', href: '/',           emoji: '🏠', label: '홈' },
  { id: 'yard', href: '/yard',       emoji: '🌳', label: '마당' },
  { id: 'lib',  href: '/me/library', emoji: '📚', label: '서재' },
]

export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '430px',
      height: '64px',
      background: 'rgba(254, 252, 248, 0.95)',
      borderTop: '1px solid rgba(92, 61, 46, 0.12)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{
            fontSize: '22px',
            lineHeight: 1,
            transform: isActive(tab.href) ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.2s',
          }}>
            {tab.emoji}
          </span>
          <span style={{
            fontSize: '10px',
            color: isActive(tab.href) ? '#C17F3C' : '#9A8470',
            fontWeight: isActive(tab.href) ? 500 : 400,
            transition: 'color 0.2s',
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  )
}