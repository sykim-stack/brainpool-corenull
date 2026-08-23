'use client'

import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { id: 'yard',     href: '/yard',        emoji: '🌳', label: '마당' },
  { id: 'living',   href: '/',            emoji: '🏠', label: '거실' },
  { id: 'library',  href: '/me/library',  emoji: '📚', label: '서재' },
]

export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string | null) => {
    if (!href) return false
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav style={styles.nav}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            if (tab.disabled || !tab.href) return
            router.push(tab.href)
          }}
          disabled={tab.disabled}
          style={{
            ...styles.tabBtn,
            ...(tab.disabled ? styles.tabBtnDisabled : {}),
          }}
        >
          <span
            style={{
              fontSize: 22,
              lineHeight: 1,
              transform: isActive(tab.href) ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.2s',
            }}
          >
            {tab.emoji}
          </span>
          <span
            style={{
              fontSize: 10,
              marginTop: 4,
              color: isActive(tab.href) ? '#C17F3C' : '#9A8470',
              fontWeight: isActive(tab.href) ? 500 : 400,
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
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
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: '8px 0',
    WebkitTapHighlightColor: 'transparent',
  },
  tabBtnDisabled: {
    cursor: 'default',
  },
}
