// lib/deviceId.ts
// Device = Owner가 CoreNull에 접속하는 개별 환경 식별자
// House / Membership / 소유권 판단에 사용하지 않는다.
// Owner 식별은 lib/ownerKey.ts 를 사용한다.
//
// SSR 환경에서는 빈 문자열 반환 (클라이언트에서만 유효)

const DEVICE_ID_KEY = 'corenull_device_id'

let _cached: string = ''

export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  if (_cached) return _cached

  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) {
    _cached = existing
    return _cached
  }

  const newId = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, newId)
  _cached = newId
  return _cached
}
