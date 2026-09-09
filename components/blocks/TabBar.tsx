'use client'

import { usePathname, useRouter } from 'next/navigation'

// 반응형: 모바일/태블릿은 하단바, 데스크톱(≥1200px)은 좌측 사이드바.
// 두 마크업을 동시에 SSR하고 CSS(.app-bottombar/.app-sidebar)가
// display로 전환한다 — JS 미디어쿼리 없이, 하이드레이션 불일치 없이.
const TABS = [
  { id: 'yard',    href: '/',           emoji: '🌳', label: '마당' },
  { id: 'living',  href: '/living',     emoji: '🛋️', label: '거실' },
  { id: 'library', href: '/me/library', emoji: '📚', label: '서재' },
]

export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <>
      {/* 모바일/태블릿 — 하단 탭바 */}
      <nav className="app-fixed-bar app-bottombar" style={{
        bottom: 0,
        height: '64px',
        background: 'rgba(254, 252, 248, 0.95)',
        borderTop: '1px solid rgba(92, 61, 46, 0.12)',
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

      {/* 데스크톱 — 좌측 사이드바 */}
      <nav className="app-sidebar" style={{
        flexDirection: 'column',
        gap: '4px',
        padding: '24px 12px',
        background: '#FEFCF8',
        borderRight: '1px solid rgba(92, 61, 46, 0.12)',
        zIndex: 100,
      }}>
        <div style={{
          fontFamily: "'Noto Serif KR', serif",
          fontSize: '17px',
          fontWeight: 600,
          color: '#2C1810',
          padding: '4px 12px 20px',
        }}>
          Core<span style={{ color: '#C17F3C' }}>Null</span>
        </div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: 'none',
              background: isActive(tab.href) ? 'rgba(193,127,60,0.1)' : 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{tab.emoji}</span>
            <span style={{
              fontSize: '14px',
              color: isActive(tab.href) ? '#C17F3C' : '#5C4A35',
              fontWeight: isActive(tab.href) ? 600 : 400,
            }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  )
}