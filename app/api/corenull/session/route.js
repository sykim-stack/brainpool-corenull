// POST /api/corenull/session — Actor 세션 발급 (HttpOnly cookie)
// body: { owner_key: string }
//
// bootstrap: 클라이언트가 localStorage Owner를 제시 → 서명 쿠키 발급.
// 이후 쓰기 API는 body owner_key가 아니라 이 쿠키의 Actor만 신뢰한다.

import { mintActorToken, actorSetCookie, actorClearCookie, resolveActor } from '@/lib/actor'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const traceId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}`

  let body = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const owner_key = typeof body.owner_key === 'string' ? body.owner_key.trim() : ''
  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 400 })
  }

  if (owner_key.length < 8 || owner_key.length > 128) {
    return Response.json({ _error: 'owner_key_invalid', traceId }, { status: 400 })
  }

  const token = mintActorToken(owner_key)
  if (!token) {
    return Response.json(
      {
        _error: 'actor_secret_not_configured',
        hint: 'set CORENULL_ACTOR_SECRET or SUPABASE_SERVICE_ROLE_KEY',
        traceId,
      },
      { status: 500 }
    )
  }

  return new Response(
    JSON.stringify({ ok: true, owner_key, source: 'session', traceId }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': actorSetCookie(token),
      },
    }
  )
}

export async function GET(req) {
  const traceId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}`
  const actor = resolveActor(req)
  if (!actor) {
    return Response.json({ actor: null, traceId }, { status: 200 })
  }
  return Response.json(
    { actor: { owner_key: actor.ownerKey, source: actor.source, exp: actor.exp }, traceId },
    { status: 200 }
  )
}

export async function DELETE() {
  const traceId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}`
  return new Response(JSON.stringify({ ok: true, traceId }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': actorClearCookie(),
    },
  })
}
