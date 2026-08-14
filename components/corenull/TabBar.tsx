'use client'

import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { id: 'yard',     href: '/yard',        emoji: '🌳', label: '마당' },
  { id: 'living',   href: '/',            emoji: '🏠', label: '거실' },
  { id: 'library',  href: '/me/library',  emoji: '📚', label: '서재' },
  { id: 'storage',  href: null,           emoji: '📦', label: '랜덤창고', disabled: true },
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
    <>
      {/* FAB 스택 — 글쓰기 / 프로필. 탭바 위 우측 하단에 고정 */}
      <div style={styles.fabStack}>
        <button
          style={{ ...styles.fab, ...styles.fabProfile }}
          onClick={() => router.push('/me')}
          aria-label="프로필"
        >
          👤
        </button>
        <button
          style={{ ...styles.fab, ...styles.fabWrite }}
          onClick={() => router.push('/write')}
          aria-label="글쓰기"
        >
          ✏️
        </button>
      </div>

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
                opacity: tab.disabled ? 0.35 : 1,
              }}
            >
              {tab.emoji}
            </span>
            <span
              style={{
                fontSize: 10,
                marginTop: 4,
                color: tab.disabled ? '#B8AE9C' : isActive(tab.href) ? '#C17F3C' : '#9A8470',
                fontWeight: isActive(tab.href) ? 500 : 400,
                transition: 'color 0.2s',
              }}
            >
              {tab.label}{tab.disabled ? ' (곧)' : ''}
            </span>
          </button>
        ))}
      </nav>
    </>
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
  fabStack: {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(155px)', // 430px 프레임 우측 정렬
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    zIndex: 110,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(44,24,16,0.25)',
  },
  fabWrite: {
    background: '#2C1810',
    color: '#FBF8F2',
  },
  fabProfile: {
    background: '#F5F0E8',
    color: '#2C1810',
    width: 40,
    height: 40,
    fontSize: 16,
    alignSelf: 'flex-end',
  },
}