// lib/corehubAuthBridge.ts
// CoreNull owner_key → CoreHub 기회 조회만 담당
// CoreHub가 facts를 분석하고 opportunity를 생성함
// CoreNull은 opportunity를 받아서 자기 View에 맞게 힌트로 변환
// CoreHub 로직 복사 금지 (Core Independence 준수)

const COREHUB_URL = process.env.COREHUB_URL || 'https://brainpool-corehub.vercel.app'

/** CoreHub 기회 타입 (CoreNull 뷰 힌트용) */
export interface CoreHubOpportunity {
  id: string
  opportunity_type: 'nudge.seed.owner' | 'celebrate.achievement' | 'suggest.translation.help'
  source_meaning_id: string
  target_owner_key: string
  priority: 'high' | 'medium' | 'low'
  action_type: string
  payload: Record<string, any>
  expires_at: string | null
  is_consumed: boolean
  created_at: string
}

/**
 * CoreHub opportunities 조회 (server-side)
 * CoreHub API가 owner_key 쿼리를 지원하면 공개 조회 가능
 * 현재는 Bearer 인증 필요 → core_users 매핑 없으면 빈 배열 반환 (CoreNull 단독 동작 보장)
 * CoreHub 쪽에서 owner_key 쿼리 지원 시 이 함수만 교체하면 됨
 */
export async function fetchCoreHubOpportunities(ownerKey: string): Promise<CoreHubOpportunity[]> {
  // CoreHub opportunities API는 현재 Bearer 인증 필요
  // CoreNull은 localStorage owner_key만 있음 → 매핑 테이블(core_users) 없음
  // 임시: 빈 배열 반환하여 CoreNull 단독 동작 보장
  // CoreHub 쪽에서 owner_key 쿼리 지원 시 아래 주석 해제하고 사용
  /*
  try {
    const res = await fetch(`${COREHUB_URL}/api/corehub/opportunities?owner_key=${ownerKey}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.data) ? data.data : []
  } catch {
    return []
  }
  */
  console.warn('[corehubAuthBridge] CoreHub opportunities requires Bearer auth; returning empty. CoreHub side needs owner_key query support.')
  return []
}

/**
 * CoreHub facts 직접 조회 (public, owner_key 지원) — 디버깅/동기화용
 * 개인화 데이터이므로 no-store
 */
export async function fetchCoreHubFactsDirect(ownerKey: string, limit = 50): Promise<any[]> {
  try {
    const res = await fetch(`${COREHUB_URL}/api/corehub/facts?owner_key=${ownerKey}&limit=${limit}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.data) ? data.data : []
  } catch {
    return []
  }
}