// CoreNull 공간 탭 — 가운데 메뉴는 "현재 보고 있는 집" 기준.
// 서재는 개인 공간이라 항상 /me/library.

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

export function getContextHouseId(pathname: string | null): string | null {
  if (!pathname) return null
  const m = pathname.match(/^\/houses\/([^/]+)\/(yard|living)\/?$/)
  return m ? m[1] : null
}

export function getTabHref(tabId: NavTabId, pathname: string | null): string {
  const houseId = getContextHouseId(pathname)
  if (tabId === 'library') return '/me/library'
  if (houseId) {
    if (tabId === 'yard') return `/houses/${houseId}/yard`
    if (tabId === 'living') return `/houses/${houseId}/living`
  }
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
    return pathname === '/' || pathname === '/yard' || /\/houses\/[^/]+\/yard\/?$/.test(pathname)
  }
  if (tabId === 'living') {
    return pathname === '/living' || /\/houses\/[^/]+\/living\/?$/.test(pathname)
  }
  return false
}
