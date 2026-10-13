// lib/actorFetch.ts
// 쓰기 API 호출 전 Actor 세션을 보장하고 credentials를 항상 포함한다.
// body owner_key는 더 이상 권한 근거가 아니다 (서버는 cookie Actor만 신뢰).

import { ensureActorSession } from '@/lib/ownerKey'

export type ActorFetchInit = RequestInit & {
  /** true면 ensureActorSession을 먼저 호출 (기본 true for mutating methods) */
  ensureSession?: boolean
}

function isMutating(method?: string) {
  const m = (method || 'GET').toUpperCase()
  return m === 'POST' || m === 'PATCH' || m === 'PUT' || m === 'DELETE'
}

/**
 * fetch wrapper for CoreNull APIs.
 * - mutating 요청: ensureActorSession → credentials: 'include'
 * - GET도 credentials include (bookmarks 등 actor 우선 조회)
 */
export async function actorFetch(input: RequestInfo | URL, init: ActorFetchInit = {}): Promise<Response> {
  const { ensureSession, ...rest } = init
  const shouldEnsure = ensureSession ?? isMutating(rest.method)

  if (shouldEnsure && typeof window !== 'undefined') {
    await ensureActorSession()
  }

  return fetch(input, {
    ...rest,
    credentials: rest.credentials ?? 'include',
  })
}
