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
  /** 공간 이름 — 알려진 공간은 아이콘으로 표시 (마당→🌳 등) */
  title?: string
  shareUrl?: string
  /** ignored — right side fixed: me + 마당↔광장 + 공유 */
  actions?: TopBarAction[]
}

/** 로고 옆 제목: 한글 대신 공간 아이콘 */
const TITLE_ICON: Record<string, string> = {
  마당: '🌳',
  거실: '🛋️',
  서재: '📚',
  광장: '🏛️',
  나: '👤',
  새이야기: '✏️',
  '새 이야기': '✏️',
}

function titleToIcon(title?: string): string | null {
  if (!title) return null
  return TITLE_ICON[title.trim()] || null
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
  const titleIcon = titleToIcon(title)

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
          {titleIcon ? (
            <span style={styles.titleIcon} aria-label={title} title={title}>
              {titleIcon}
            </span>
          ) : title ? (
            <span style={styles.title}>{title}</span>
          ) : null}
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
                style={{
                  ...styles.topNavItem,
                  color: active ? '#C17F3C' : '#5C4A35',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 15 }}>{tab.emoji}</span>
                {tab.label}
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
  titleIcon: {
    fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center',
  },
  topNav: { alignItems: 'center', gap: '28px' },
  topNavItem: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '6px 4px',
  },
  right: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  actionBtn: {
    width: '36px', height: '36px', borderRadius: '50%', background: '#F5F0E8',
    border: 'none', fontSize: '16px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
  },
}
