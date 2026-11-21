import { getSupabaseAdmin } from '@/lib/supabase'
import { resolveCoreNullOwnerByAuthUserId } from '@/lib/identity/resolveCoreNullOwnerFromToken.mjs'

export const dynamic = 'force-dynamic'

const COREHUB_API_URL = process.env.COREHUB_API_URL

export async function POST(request) {
  const traceId = crypto.randomUUID()
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ _error: 'invalid_json', traceId }, { status: 400 })
  }

  const ticket = typeof body?.ticket === 'string' ? body.ticket : ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) {
    return Response.json({ _error: 'invalid_ticket', traceId }, { status: 400 })
  }
  if (!COREHUB_API_URL) {
    return Response.json({ _error: 'corehub_url_not_configured', traceId }, { status: 503 })
  }

  let exchangeResponse
  try {
    exchangeResponse = await fetch(`${COREHUB_API_URL}/api/auth/handoffs/exchange`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ticket, audience: 'corenull' }),
    })
  } catch {
    return Response.json({ _error: 'corehub_unavailable', traceId }, { status: 503 })
  }

  const exchange = await exchangeResponse.json().catch(() => null)
  const handoff = exchange?.data
  if (
    !exchangeResponse.ok ||
    handoff?.audience !== 'corenull' ||
    typeof handoff?.auth_user_id !== 'string' ||
    typeof handoff?.session_token !== 'string' ||
    typeof handoff?.expires_at !== 'string'
  ) {
    const status =
      exchangeResponse.status === 401 ? 401 : exchangeResponse.status === 400 ? 400 : 503
    return Response.json({ _error: 'handoff_exchange_failed', traceId }, { status })
  }

  const expiry = Date.parse(handoff.expires_at)
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    return Response.json({ _error: 'invalid_corehub_session', traceId }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return Response.json({ _error: 'owner_mapping_unavailable', traceId }, { status: 503 })
  }

  const resolved = await resolveCoreNullOwnerByAuthUserId(supabase, handoff.auth_user_id)
  if (!resolved.ok) {
    const status = resolved.error === 'owner_link_required' ? 409 : 503
    return Response.json({ _error: resolved.error, traceId }, { status })
  }

  const response = Response.json(
    { data: { owner_key: resolved.ownerKey }, traceId },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    },
  )
  const maxAge = Math.floor((expiry - Date.now()) / 1000)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.headers.append(
    'Set-Cookie',
    `corehub_session=${encodeURIComponent(handoff.session_token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  )
  return response
}
