// lib/activeHouse.ts
// Owner 1 : House n — 현재 보고 있는 집(컨텍스트) 저장
// Device/Owner와 별개. 없으면 호출부가 houses[0]으로 폴백.

const ACTIVE_HOUSE_KEY = 'corenull_active_house_id'

export function getActiveHouseId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(ACTIVE_HOUSE_KEY) || ''
}

export function setActiveHouseId(houseId: string): void {
  if (typeof window === 'undefined') return
  if (!houseId) return
  localStorage.setItem(ACTIVE_HOUSE_KEY, houseId)
}

export function clearActiveHouseId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_HOUSE_KEY)
}

/** houses 목록에서 active를 고른다. 없으면 첫 집. */
export function pickActiveHouse<T extends { id: string }>(houses: T[]): T | null {
  if (!houses.length) return null
  const saved = getActiveHouseId()
  if (saved) {
    const found = houses.find((h) => h.id === saved)
    if (found) return found
  }
  return houses[0]
}
