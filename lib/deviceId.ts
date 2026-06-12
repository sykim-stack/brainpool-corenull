// lib/deviceId.ts
// 앱 최초 실행 시 device_id 생성 후 localStorage에 저장
// 이후 모든 API 호출에서 owner_key로 사용

const DEVICE_ID_KEY = 'corenull_device_id'

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'

  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing

  const newId = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, newId)
  return newId
}