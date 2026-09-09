'use client'

import { usePathname, useRouter } from 'next/navigation'
import { NAV_TABS } from '@/lib/navTabs'

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
  actions?: TopBarAction[]
}

export default function TopBar({ onBack, logo, title, actions = [] }: TopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header style={styles.outer}>
      <div className="app-shell-content" style={styles.inner}>
        <div style={styles.left}>
          {onBack && (
            <button style={styles.backBtn} onClick={onBack} aria-label="뒤로가기">
              ←
            </button>
          )}
          {!onBack && logo}
          {title && <span style={styles.title}>{title}</span>}
        </div>

        {/* 데스크톱 전용 가로 메뉴 — 모바일/태블릿에선 CSS로 숨김 */}
        <nav className="app-topnav" style={styles.topNav}>
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              style={{
                ...styles.topNavItem,
                color: isActive(tab.href) ? '#C17F3C' : '#5C4A35',
                fontWeight: isActive(tab.href) ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 15 }}>{tab.emoji}</span>{tab.label}
            </button>
          ))}
        </nav>

        {actions.length > 0 && (
          <div style={styles.right}>
            {actions.map((action) => (
              <button
                key={action.key}
                style={styles.actionBtn}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.label}
              >
                {action.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

const styles: Record<string, React.CSSProperties> = {
  outer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '56px',
    background: 'rgba(254, 252, 248, 0.95)',
    borderBottom: '1px solid rgba(92, 61, 46, 0.12)',
    zIndex: 100,
    backdropFilter: 'blur(12px)',
  },
  inner: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    boxSizing: 'border-box',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  backBtn: {
    fontSize: '20px', color: '#2C1810', background: 'none', border: 'none',
    cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
  },
  title: {
    fontFamily: "'Noto Serif KR', serif", fontSize: '16px', fontWeight: 600,
    color: '#2C1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  topNav: {
    alignItems: 'center',
    gap: '28px',
  },
  topNavItem: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
    padding: '6px 4px',
  },
  right: {
    display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
  },
  actionBtn: {
    width: '36px', height: '36px', borderRadius: '50%', background: '#F5F0E8',
    border: 'none', fontSize: '16px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
  },
}