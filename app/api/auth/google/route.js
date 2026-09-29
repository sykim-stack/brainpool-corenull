// app/api/auth/google/route.js
// Google ID 토큰(id_token) 검증 → google sub → /api/identity/sync 매핑 → owner_key 반환.
//
// POST /api/auth/google
//   body: { id_token: string, current_owner_key?: string }
//   - current_owner_key: 클라이언트 localStorage 기존 owner_key (기존 사용자 LINK용)
//   - supabase.auth.signInWithIdToken({provider:'google', token}) → 구글 서브 추출
//   - 서버→서버 호출로 /api/identity/sync 에 매핑 위임
//
// ⚠️ env: Google provider는 Supabase Dashboard에서 활성화 필요 (client id/secret는 .env.local 침범 없음).

import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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
    // Google ID 토큰 검증 (토큰의 aud가 Supabase에 등록된 Google client_id 와 일치해야 함)
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

    // google sub 추출
    const googleIdentity = user.identities?.find((i) => i.provider === 'google')
    const googleSub =
      googleIdentity?.identity_data?.sub ||
      googleIdentity?.id ||
      user.identities?.[0]?.identity_data?.sub ||
      user.id

    if (!googleSub) {
      return Response.json({ _error: 'no_google_identity', traceId }, { status: 401 })
    }

    // identity 매핑 (서버→서버)
    const origin = new URL(request.url).origin
    const syncRes = await fetch(`${origin}/api/identity/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        provider_sub: googleSub,
        owner_key: current_owner_key || undefined,
      }),
    })
    const sync = await syncRes.json()

    if (sync._error) {
      return Response.json(
        { _error: sync._error, owner_key: sync.owner_key, detail: sync.detail, traceId },
        { status: syncRes.status }
      )
    }

    // owner_key는 기존 UUID(보존) 혹은 신규 생성 UUID. google sub은 절대 owner_key가 되지 않음.
    return Response.json(
      { data: { owner_key: sync.data.owner_key, is_new_user: sync.data.is_new_user, linked: true }, traceId },
      { status: 200 }
    )
  } catch (e) {
    return Response.json({ _error: e.message, traceId }, { status: 500 })
  }
}
