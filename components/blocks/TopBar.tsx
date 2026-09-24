'use client'

import { usePathname, useRouter } from 'next/navigation'
import { NAV_TABS, getTabHref, isTabActive } from '@/lib/navTabs'

export interface TopBarAction {
  key: string
  emoji: string
  label?: string
  onClick: () => void
  disabled?: boolean
}

export interface TopBarProps {
  onBack?: () => void
  logo?: React.ReactNode
  title?: string
  shareUrl?: string
  /** ignored — right side fixed: me + 마당↔광장 + 공유 */
  actions?: TopBarAction[]
}

function isYardPath(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/' || pathname === '/yard') return true
  return /\/houses\/[^/]+\/yard\/?$/.test(pathname)
}

export default function TopBar({ logo, title, shareUrl }: TopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const onYard = isYardPath(pathname)

  const handleShare = async () => {
    const url = shareUrl || (typeof window !== 'undefined' ? window.location.href : '')
    if (!url) return
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ url, title: title || 'CoreNull' })
        return
      }
    } catch { /* cancelled */ }
    try {
      await navigator.clipboard.writeText(url)
    } catch { /* ignore */ }
  }

  // 마당일 때: 광장. 그 외: 내 마당 (항상 나 기준)
  const spaceAction = onYard
    ? { key: 'plaza', emoji: '🏛️', label: '광장', onClick: () => router.push('/plaza') }
    : { key: 'home', emoji: '🏠', label: '내 마당', onClick: () => router.push('/yard') }

  const rightActions = [
    { key: 'me', emoji: '👤', label: '나', onClick: () => router.push('/me') },
    spaceAction,
    { key: 'share', emoji: '🔗', label: '공유', onClick: handleShare },
  ]

  return (
    <header style={styles.outer}>
      <div className="app-shell-content" style={styles.inner}>
        <div style={styles.left}>
          {logo}
          {title && <span style={styles.title}>{title}</span>}
        </div>

        <nav className="app-topnav" style={styles.topNav} aria-label="공간 메뉴">
          {NAV_TABS.map((tab) => {
            const active = isTabActive(tab.id, pathname)
            const href = getTabHref(tab.id, pathname)
            return (
              <button
                key={tab.id}
                onClick={() => router.push(href)}
                aria-label={tab.label}
                title={tab.label}
                style={{
                  ...styles.topNavItem,
                  opacity: active ? 1 : 0.55,
                  transform: active ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.emoji}</span>
              </button>
            )
          })}
        </nav>

        <div style={styles.right}>
          {rightActions.map((action) => (
            <button
              key={action.key}
              style={styles.actionBtn}
              onClick={action.onClick}
              aria-label={action.label}
              title={action.label}
            >
              {action.emoji}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

const styles: Record<string, React.CSSProperties> = {
  outer: {
    position: 'fixed', top: 0, left: 0, right: 0, width: '100%', height: '56px',
    background: 'rgba(254, 252, 248, 0.95)',
    borderBottom: '1px solid rgba(92, 61, 46, 0.12)',
    zIndex: 100, backdropFilter: 'blur(12px)',
  },
  inner: {
    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', boxSizing: 'border-box',
  },
  left: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
  title: {
    fontFamily: "'Noto Serif KR', serif", fontSize: '16px', fontWeight: 600,
    color: '#2C1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  topNav: { alignItems: 'center', gap: '20px' },
  topNavItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
    transition: 'transform 0.15s, opacity 0.15s',
  },
  right: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  actionBtn: {
    width: '36px', height: '36px', borderRadius: '50%', background: '#F5F0E8',
    border: 'none', fontSize: '16px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
  },
}
