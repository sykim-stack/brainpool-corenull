'use client'

import { usePathname, useRouter } from 'next/navigation'
import { NAV_TABS } from '@/lib/navTabs'

// 모바일/태블릿 전용 하단 탭바. 데스크톱(≥1200px)에선 숨겨지고
// 같은 메뉴가 TopBar 안의 가로 내비(app-topnav)로 올라간다.
export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav className="app-fixed-bar app-bottombar" style={{
      bottom: 0,
      height: '64px',
      background: 'rgba(254, 252, 248, 0.95)',
      borderTop: '1px solid rgba(92, 61, 46, 0.12)',
      alignItems: 'center',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      {NAV_TABS.map((tab) => (
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