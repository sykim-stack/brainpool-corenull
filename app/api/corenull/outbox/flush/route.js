export const dynamic = 'force-dynamic'

const COREHUB_URL =
  process.env.COREHUB_API_URL ||
  'https://brainpool-corehub.vercel.app/api/corehub/facts'

const BATCH = 20
const MAX_ATTEMPTS = 8

function backoffSeconds(attempts) {
  // 15s, 30s, 60s, 120s ... cap 30m
  return Math.min(30 * 60, 15 * Math.pow(2, Math.max(0, attempts - 1)))
}

/**
 * POST /api/corenull/outbox/flush
 * pending outbox → CoreHub facts
 *
 * Auth (optional but recommended):
 *   Authorization: Bearer <CRON_SECRET>
 *   or x-cron-secret: <CRON_SECRET>
 */
export async function POST(req) {
  const traceId = crypto.randomUUID()
  const expected = (process.env.CRON_SECRET || '').trim()
  if (expected) {
    const auth = req.headers.get('authorization') || ''
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    const header = (req.headers.get('x-cron-secret') || '').trim()
    if (bearer !== expected && header !== expected) {
      return Response.json({ _error: 'unauthorized', traceId }, { status: 401 })
    }
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) {
    return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })
  }

  const now = new Date().toISOString()
  const { data: rows, error: selectError } = await supabase
    .from('corenull_message_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('next_attempt_at', now)
    .order('created_at', { ascending: true })
    .limit(BATCH)

  if (selectError) {
    return Response.json({ _error: selectError.message, traceId }, { status: 500 })
  }

  const results = []
  for (const row of rows || []) {
    const result = await processRow(supabase, row, traceId)
    results.push(result)
  }

  return Response.json({
    data: {
      claimed: (rows || []).length,
      results,
    },
    traceId,
  })
}

async function processRow(supabase, row, traceId) {
  const attempts = (row.attempts || 0) + 1
  const factBody = {
    source: 'CoreNull',
    fact_type: row.fact_type || 'space.message.created',
    owner_key: row.owner_key,
    house_id: row.payload?.house_id || null,
    occurred_at: row.created_at || new Date().toISOString(),
    payload: {
      ...(row.payload || {}),
      outbox_id: row.id,
      message_id: row.message_id,
      idempotency_key: row.idempotency_key,
    },
  }

  if (!row.owner_key) {
    await supabase
      .from('corenull_message_outbox')
      .update({
        status: 'failed',
        attempts,
        last_error: 'owner_key_missing',
        next_attempt_at: null,
      })
      .eq('id', row.id)
    return { id: row.id, ok: false, error: 'owner_key_missing' }
  }

  let httpStatus = 0
  let responseText = ''
  try {
    const res = await fetch(COREHUB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': row.idempotency_key || row.id,
      },
      body: JSON.stringify(factBody),
      signal: AbortSignal.timeout(15000),
    })
    httpStatus = res.status
    responseText = await res.text().catch(() => '')

    if (res.ok) {
      await supabase
        .from('corenull_message_outbox')
        .update({
          status: 'sent',
          attempts,
          sent_at: new Date().toISOString(),
          last_error: null,
          next_attempt_at: null,
        })
        .eq('id', row.id)
      return { id: row.id, ok: true, status: httpStatus }
    }

    // 4xx (except 408/429): stop retrying
    const permanent =
      httpStatus >= 400 &&
      httpStatus < 500 &&
      httpStatus !== 408 &&
      httpStatus !== 429

    if (permanent || attempts >= MAX_ATTEMPTS) {
      await supabase
        .from('corenull_message_outbox')
        .update({
          status: 'failed',
          attempts,
          last_error: `http_${httpStatus}:${responseText.slice(0, 200)}`,
          next_attempt_at: null,
        })
        .eq('id', row.id)
      return { id: row.id, ok: false, status: httpStatus, permanent: true }
    }

    const next = new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString()
    await supabase
      .from('corenull_message_outbox')
      .update({
        status: 'pending',
        attempts,
        last_error: `http_${httpStatus}:${responseText.slice(0, 200)}`,
        next_attempt_at: next,
      })
      .eq('id', row.id)
    return { id: row.id, ok: false, status: httpStatus, next_attempt_at: next }
  } catch (e) {
    const msg = e?.message || String(e)
    if (attempts >= MAX_ATTEMPTS) {
      await supabase
        .from('corenull_message_outbox')
        .update({
          status: 'failed',
          attempts,
          last_error: msg.slice(0, 300),
          next_attempt_at: null,
        })
        .eq('id', row.id)
      return { id: row.id, ok: false, error: msg, permanent: true }
    }
    const next = new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString()
    await supabase
      .from('corenull_message_outbox')
      .update({
        status: 'pending',
        attempts,
        last_error: msg.slice(0, 300),
        next_attempt_at: next,
      })
      .eq('id', row.id)
    return { id: row.id, ok: false, error: msg, next_attempt_at: next }
  }
}

export async function GET(req) {
  // 상태 조회용 (전송 안 함)
  const traceId = crypto.randomUUID()
  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) {
    return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })
  }
  const { count: pending } = await supabase
    .from('corenull_message_outbox')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  const { count: sent } = await supabase
    .from('corenull_message_outbox')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
  return Response.json({
    data: { pending: pending ?? 0, sent: sent ?? 0 },
    traceId,
  })
}
