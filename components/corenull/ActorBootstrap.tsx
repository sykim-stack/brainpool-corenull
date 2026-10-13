'use client'

import { useEffect } from 'react'
import { ensureActorSession, getOwnerKey } from '@/lib/ownerKey'

/**
 * 앱 로드 시 Actor 세션(HttpOnly cookie)을 발급/갱신한다.
 * 쓰기 API는 body owner_key가 아니라 이 쿠키의 Actor만 신뢰한다.
 */
export default function ActorBootstrap() {
  useEffect(() => {
    if (!getOwnerKey()) return
    ensureActorSession().catch(() => {})
  }, [])
  return null
}
