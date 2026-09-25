'use client'

import { usePathname, useRouter } from 'next/navigation'
import { NAV_TABS, getTabHref, isTabActive } from '@/lib/navTabs'

// 모바일/태블릿 하단 탭 — 아이콘 + 한글. 링크는 현재 집 기준.
export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav
      className="app-fixed-bar app-bottombar"
      aria-label="공간 메뉴"
      style={{
        bottom: 0,
        height: '64px',
        background: 'rgba(254, 252, 248, 0.95)',
        borderTop: '1px solid rgba(92, 61, 46, 0.12)',
        alignItems: 'center',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}
    >
      {NAV_TABS.map((tab) => {
        const active = isTabActive(tab.id, pathname)
        const href = getTabHref(tab.id, pathname)
        return (
          <button
            key={tab.id}
            onClick={() => router.push(href)}
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
            <span
              style={{
                fontSize: '22px',
                lineHeight: 1,
                transform: active ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.2s',
              }}
            >
              {tab.emoji}
            </span>
            <span
              style={{
                fontSize: '10px',
                color: active ? '#C17F3C' : '#9A8470',
                fontWeight: active ? 500 : 400,
                transition: 'color 0.2s',
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
