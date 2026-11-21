// app/api/identity/sync/route.js
// Owner 연결 테이블(corenull_owner_identities) 기반,
//   provider_sub  ↔  기존 owner_key(UUID)  매핑 API.
//
// POST /api/identity/sync
//   body: { provider: 'google'|'kakao'|'supabase'|'auth', provider_sub: string, owner_key?: string }
//   - 기존 매핑 있음      → 기존 owner_key 복원            (is_new_user=false)
//   - 매핑 없고 owner_key 있음 → provider_sub↔owner_key LINK (is_new_user=false, linked=true)
//   - 매핑 없고 owner_key 없음 → 새 UUID owner_key 생성       (is_new_user=true)
//   - 동일 provider_sub가 다른 owner_key에 이미 연결 → 409 IDENTITY_CONFLICT
//
// provider=supabase|auth: CoreHub handoff의 auth_user_id 매핑용 (자동 병합 금지 경로와 별개)

import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_PROVIDERS = new Set(['google', 'kakao', 'supabase', 'auth'])

export async function POST(request) {
  const traceId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ _error: 'invalid_json', traceId }, { status: 400 })
  }

  const { provider, provider_sub, owner_key: currentOwnerKey } = body || {}
  if (!provider || !provider_sub) {
    return Response.json({ _error: 'provider_and_provider_sub_required', traceId }, { status: 400 })
  }
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return Response.json({ _error: 'invalid_provider', traceId }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return Response.json({ _error: 'supabase_service_role_not_configured', traceId }, { status: 500 })
  }

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('corenull_owner_identities')
      .select('owner_key, provider')
      .eq('provider', provider)
      .eq('provider_sub', provider_sub)
      .maybeSingle()

    if (lookupError) {
      return Response.json({ _error: lookupError.message, traceId }, { status: 500 })
    }

    if (existing) {
      if (currentOwnerKey && existing.owner_key !== currentOwnerKey) {
        return Response.json(
          { _error: 'IDENTITY_CONFLICT', owner_key: existing.owner_key, detail: 'account_linked_to_another_owner', traceId },
          { status: 409 }
        )
      }
      return Response.json(
        { data: { owner_key: existing.owner_key, linked: true, is_new_user: false }, traceId },
        { status: 200 }
      )
    }

    const owner_key = currentOwnerKey || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `o_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`)

    const { error: insertError } = await supabase
      .from('corenull_owner_identities')
      .insert({ provider, provider_sub, owner_key })

    if (insertError) {
      return Response.json({ _error: insertError.message, traceId }, { status: 500 })
    }

    return Response.json(
      { data: { owner_key, linked: true, is_new_user: !currentOwnerKey }, traceId },
      { status: 200 }
    )
  } catch (e) {
    return Response.json({ _error: e.message, traceId }, { status: 500 })
  }
}
