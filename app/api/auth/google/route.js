// app/api/auth/google/route.js
// Google ID 토큰 검증 → google sub 매핑 → owner_key 반환.
// 추가로 Supabase auth user id(provider=supabase)를 같은 owner_key에 연결해
// CoreHub handoff redeem이 기존 Owner를 찾을 수 있게 한다.

import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function syncIdentity(origin, body) {
  const res = await fetch(`${origin}/api/identity/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export async function POST(request) {
  const traceId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  const { id_token, current_owner_key } = await request.json().catch(() => ({}))
  if (!id_token) {
    return Response.json({ _error: 'id_token_required', traceId }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
    })

    if (error || !user) {
      return Response.json(
        { _error: 'google_token_invalid', detail: error?.message, traceId },
        { status: 401 }
      )
    }

    const googleIdentity = user.identities?.find((i) => i.provider === 'google')
    const googleSub =
      googleIdentity?.identity_data?.sub ||
      googleIdentity?.id ||
      user.identities?.[0]?.identity_data?.sub ||
      user.id

    if (!googleSub) {
      return Response.json({ _error: 'no_google_identity', traceId }, { status: 401 })
    }

    const origin = new URL(request.url).origin

    // 1) Google sub → owner_key (기존 계약 유지)
    const { res: syncRes, json: sync } = await syncIdentity(origin, {
      provider: 'google',
      provider_sub: googleSub,
      owner_key: current_owner_key || undefined,
    })

    if (sync._error) {
      return Response.json(
        { _error: sync._error, owner_key: sync.owner_key, detail: sync.detail, traceId },
        { status: syncRes.status }
      )
    }

    const ownerKey = sync.data.owner_key

    // 2) Supabase Auth user id → 동일 owner_key (handoff용, 실패해도 로그인 성공은 유지)
    if (user.id && ownerKey) {
      await syncIdentity(origin, {
        provider: 'supabase',
        provider_sub: user.id,
        owner_key: ownerKey,
      }).catch(() => null)
    }

    return Response.json(
      { data: { owner_key: ownerKey, is_new_user: sync.data.is_new_user, linked: true }, traceId },
      { status: 200 }
    )
  } catch (e) {
    return Response.json({ _error: e.message, traceId }, { status: 500 })
  }
}
