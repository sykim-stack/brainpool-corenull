'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'

// 기본 탭바 — 항상 최하단, 3개 고정 (§7: 글쓰기·내정보는 FloatingActions로 분리)
// 공간 계층(마당/거실/서재) 그대로 반영 — '홈'은 이 계층에 없는 개념이라 제거.
//
// '마당'만 동적 경로(/houses/[내 houseId]/yard)라 house_id 조회가 필요하다.
// 다른 페이지들(write 등)이 이미 쓰던 패턴(getDeviceId → houses 조회, 1인1집이라
// 첫 번째 House 사용) 그대로 재사용 — 별도 개념 새로 안 만든다.
const STATIC_TABS = [
  { id: 'living',  href: '/living',     emoji: '🛋️', label: '거실' },
  { id: 'library', href: '/me/library', emoji: '📚', label: '서재' },
]

export default function TabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [myHouseId, setMyHouseId] = useState<string | null>(null)

  useEffect(() => {
    const key = getDeviceId()
    if (!key) return
    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then(r => r.json())
      .then(d => setMyHouseId(d.data?.[0]?.id || null))
  }, [])

  const yardHref = myHouseId ? `/houses/${myHouseId}/yard` : null
  const tabs = [
    { id: 'yard', href: yardHref, emoji: '🌳', label: '마당' },
    ...STATIC_TABS,
  ]

  const isActive = (href: string | null) => !!href && pathname.startsWith(href)

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
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => tab.href && router.push(tab.href)}
          disabled={!tab.href}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            border: 'none',
            background: 'none',
            cursor: tab.href ? 'pointer' : 'default',
            opacity: tab.href ? 1 : 0.4,
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