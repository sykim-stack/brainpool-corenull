// lib/actor.js
// ADR-AUTH-001 — Auth Actor
//
// 규칙:
// - body/query의 owner_key는 권한 근거가 아니다.
// - 권한 주체는 resolveActor(req)가 반환하는 Owner만이다.
// - Actor 세션 = 서버가 서명한 토큰 (HttpOnly cookie 또는 Bearer).
//
// 한계 (의도적으로 문서화):
// - 익명 Owner UUID 모델에서 최초 세션 발급은 owner_key 제시로 bootstrap 한다.
//   UUID를 아는 자는 동일하게 세션을 받을 수 있다 (= API 키 모델).
// - 재바인딩·탈취 방지의 진짜 경계는 Google/link_code 등 증명 경로(후속)다.
// - 이 ADR의 목표는 "요청마다 임의 owner_key를 body로 바꿔 위장"을 끊는 것이다.

import { createHmac, timingSafeEqual } from 'crypto'

export const ACTOR_COOKIE = 'corenull_actor'
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30d

function actorSecret() {
  return process.env.CORENULL_ACTOR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

/** ownerKey → 서명 토큰 */
export function mintActorToken(ownerKey) {
  if (!ownerKey || !actorSecret()) return null
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC
  const payload = `${ownerKey}.${exp}`
  const sig = createHmac('sha256', actorSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/** 토큰 검증 → { ownerKey, exp } | null */
export function verifyActorToken(token) {
  if (!token || !actorSecret()) return null
  const parts = String(token).split('.')
  if (parts.length !== 3) return null
  const [ownerKey, expStr, sig] = parts
  if (!ownerKey || !expStr || !sig) return null
  const payload = `${ownerKey}.${expStr}`
  const expected = createHmac('sha256', actorSecret()).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  const exp = parseInt(expStr, 10)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null
  return { ownerKey, exp }
}

/**
 * 요청에서 Actor를 확정한다.
 * 우선순위: cookie → Authorization Bearer → x-corenull-actor
 * body/query owner_key는 절대 사용하지 않는다.
 */
export function resolveActor(req) {
  const cookieHeader = req.headers.get('cookie') || ''
  const m = cookieHeader.match(/(?:^|;\s*)corenull_actor=([^;]+)/)
  if (m) {
    const v = verifyActorToken(decodeURIComponent(m[1]))
    if (v) return { ownerKey: v.ownerKey, source: 'cookie', exp: v.exp }
  }

  const auth = req.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    const v = verifyActorToken(auth.slice(7).trim())
    if (v) return { ownerKey: v.ownerKey, source: 'bearer', exp: v.exp }
  }

  const hdr = req.headers.get('x-corenull-actor')
  if (hdr) {
    const v = verifyActorToken(hdr.trim())
    if (v) return { ownerKey: v.ownerKey, source: 'header', exp: v.exp }
  }

  return null
}

/** Set-Cookie 헤더 값 */
export function actorSetCookie(token) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${ACTOR_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`
}

/** Clear cookie */
export function actorClearCookie() {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${ACTOR_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

/**
 * 쓰기 API용. actor 없으면 401 Response를 담아 반환.
 * @returns {{ actor: { ownerKey, source, exp } } | { error: Response }}
 */
export function requireActor(req, traceId) {
  const actor = resolveActor(req)
  if (!actor) {
    return {
      error: Response.json(
        { _error: 'actor_required', hint: 'POST /api/corenull/session first', traceId },
        { status: 401 }
      ),
    }
  }
  return { actor }
}

/**
 * body에 owner_key가 있으면 actor와 일치해야 한다. 불일치 시 403.
 */
export function assertOwnerMatchesActor(bodyOwnerKey, actor, traceId) {
  if (bodyOwnerKey && bodyOwnerKey !== actor.ownerKey) {
    return Response.json({ _error: 'actor_mismatch', traceId }, { status: 403 })
  }
  return null
}
