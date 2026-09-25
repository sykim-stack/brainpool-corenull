// lib/ownerKey.ts
// Owner = 사람의 지속적 정체성 (House·Membership 귀속)
// Device ≠ Owner. Device는 접속 환경일 뿐이다.
//
// 규칙:
// - getOwnerKey()는 Owner를 새로 만들지 않는다.
// - Owner가 없으면 빈 문자열을 반환한다 → 호출부가 복구/신규를 확정해야 한다.
// - 기존 사용자 호환: corenull_owner_key가 없고 corenull_device_id만 있으면
//   그 device_id를 한 번 Owner로 승격한다 (기존 House 보존).

const OWNER_KEY = 'corenull_owner_key'
const DEVICE_ID_KEY = 'corenull_device_id'

let _cached: string = ''

/**
 * 저장된 Owner ID를 반환한다. 없으면 ''.
 * 새 UUID를 만들지 않는다.
 */
export function getOwnerKey(): string {
  if (typeof window === 'undefined') return ''
  if (_cached) return _cached

  const existing = localStorage.getItem(OWNER_KEY)
  if (existing) {
    _cached = existing
    return _cached
  }

  // 기존 사용자 호환: device_id만 있으면 한 번 Owner로 승격
  // (지금까지 owner_key === device_id였으므로 기존 House를 잃지 않음)
  const legacyDevice = localStorage.getItem(DEVICE_ID_KEY)
  if (legacyDevice) {
    localStorage.setItem(OWNER_KEY, legacyDevice)
    _cached = legacyDevice
    return _cached
  }

  return ''
}

/**
 * Owner를 저장한다. recover / 신규 확정 시에만 호출한다.
 */
export function setOwnerKey(ownerKey: string): void {
  if (typeof window === 'undefined') return
  if (!ownerKey) return
  localStorage.setItem(OWNER_KEY, ownerKey)
  _cached = ownerKey
}

/**
 * Owner를 지운다. (테스트·로그아웃용)
 */
export function clearOwnerKey(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(OWNER_KEY)
  _cached = ''
}

/**
 * 신규 Owner를 만들고 저장한다. "새로 시작" 경로에서만 호출한다.
 */
export function createOwnerKey(): string {
  if (typeof window === 'undefined') return ''
  const id = crypto.randomUUID()
  setOwnerKey(id)
  return id
}
