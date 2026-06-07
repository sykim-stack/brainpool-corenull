'use client'

import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { id: 'home',  href: '/',      emoji: '🏠', label: '홈' },
  { id: 'yard',  href: '/yard',  emoji: '🌳', label: '마당' },
  { id: 'write', href: '/write', emoji: '✏️', label: '작성', center: true },
  { id: 'me',    href: '/me',    emoji: '👤', label: '나' },
]

export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href) => {
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
            fontSize: tab.center ? '20px' : '22px',
            lineHeight: 1,
            ...(tab.center ? {
              width: '44px',
              height: '44px',
              background: '#2C1810',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '-8px',
              boxShadow: '0 4px 12px rgba(44, 24, 16, 0.3)',
            } : {
              transform: isActive(tab.href) ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.2s',
            })
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