// hooks/useOwnerKey.ts
// owner_key = 사람의 지속적 정체성 (Owner)
// device_id는 열쇠/접속 환경일 뿐, 여기서 반환하지 않는다.
// SSR 안전: useEffect 내부에서만 getOwnerKey() 호출
//
// Owner가 없으면 ''를 반환한다.
// 호출부는 빈 값일 때 House를 만들지 말고 복구/신규 확정 화면으로 보낸다.

import { useState, useEffect } from 'react'
import { getOwnerKey } from '@/lib/ownerKey'

export function useOwnerKey(): string {
  const [ownerKey, setOwnerKeyState] = useState('')

  useEffect(() => {
    setOwnerKeyState(getOwnerKey())
  }, [])

  return ownerKey
}
