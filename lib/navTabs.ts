// CoreNull 공간 탭 — 가운데 메뉴는 "현재 보고 있는 집" 기준.
// 서재는 개인 공간이라 항상 /me/library.
// 집 아이콘(오른쪽)은 항상 내 마당 — TopBar에서 별도 처리.

export type NavTabId = 'yard' | 'living' | 'library'

export const NAV_TABS: {
  id: NavTabId
  emoji: string
  label: string
}[] = [
  { id: 'yard', emoji: '🌳', label: '마당' },
  { id: 'living', emoji: '🛋️', label: '거실' },
  { id: 'library', emoji: '📚', label: '서재' },
]

/** /houses/:id/yard|living 에서 방문 중인 houseId */
export function getContextHouseId(pathname: string | null): string | null {
  if (!pathname) return null
  const m = pathname.match(/^\/houses\/([^/]+)\/(yard|living)\/?$/)
  return m ? m[1] : null
}

/** 현재 경로 + 집 맥락에 맞는 탭 href */
export function getTabHref(tabId: NavTabId, pathname: string | null): string {
  const houseId = getContextHouseId(pathname)

  if (tabId === 'library') return '/me/library'

  if (houseId) {
    if (tabId === 'yard') return `/houses/${houseId}/yard`
    if (tabId === 'living') return `/houses/${houseId}/living`
  }

  // 내 집
  if (tabId === 'yard') return '/yard'
  if (tabId === 'living') return '/living'
  return '/'
}

export function isTabActive(tabId: NavTabId, pathname: string | null): boolean {
  if (!pathname) return false
  if (tabId === 'library') {
    return pathname.startsWith('/me/library') || pathname.startsWith('/me/saved')
  }
  if (tabId === 'yard') {
    return (
      pathname === '/' ||
      pathname === '/yard' ||
      /\/houses\/[^/]+\/yard\/?$/.test(pathname)
    )
  }
  if (tabId === 'living') {
    return pathname === '/living' || /\/houses\/[^/]+\/living\/?$/.test(pathname)
  }
  return false
}
