// lib/deviceId.ts
// 앱 최초 실행 시 device_id 생성 후 localStorage에 저장
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