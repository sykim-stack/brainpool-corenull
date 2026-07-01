// hooks/useOwnerKey.ts
// owner_key = 사람의 기준점 (device_id는 열쇠 중 하나)
// SSR 안전: useEffect 내부에서만 getDeviceId() 호출

import { useState, useEffect } from 'react'
import { getDeviceId } from '@/lib/deviceId'

export function useOwnerKey(): string {
  const [ownerKey, setOwnerKey] = useState('')

  useEffect(() => {
    setOwnerKey(getDeviceId())
  }, [])

  return ownerKey
}