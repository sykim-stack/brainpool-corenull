export const dynamic = 'force-dynamic'

const COREHUB_URL =
  process.env.COREHUB_API_URL ||
  'https://brainpool-corehub.vercel.app/api/corehub/facts'

const BATCH = 20
const MAX_ATTEMPTS = 8

function backoffSeconds(attempts) {
  return Math.min(30 * 60, 15 * Math.pow(2, Math.max(0, attempts - 1)))
}

/**
 * POST /api/corenull/outbox/flush
 * pending outbox → CoreHub facts
 *
 * Auth (optional):
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

  const { getSupabaseAdmin, getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabaseAdmin() || getSupabase()
  if (!supabase) {
    return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })
  }

  const now = new Date().toISOString()
  // next_attempt_at 이 null 인 행도 처리 (레거시/수동 insert)
  const { data: due, error: selectError } = await supabase
    .from('corenull_message_outbox')
    .select('*')
    .eq('status', 'pending')
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(BATCH)

  if (selectError) {
    return Response.json({ _error: selectError.message, traceId }, { status: 500 })
  }

  const results = []
  for (const row of due || []) {
    results.push(await processRow(supabase, row, traceId))
  }

  return Response.json({
    data: { claimed: (due || []).length, results },
    traceId,
  })
}

async function markRow(supabase, id, patch) {
  const { data, error } = await supabase
    .from('corenull_message_outbox')
    .update(patch)
    .eq('id', id)
    .select('id, status, attempts, sent_at, last_error')
    .maybeSingle()
  return { data, error }
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
    const { data, error } = await markRow(supabase, row.id, {
      status: 'failed',
      attempts,
      last_error: 'owner_key_missing',
    })
    return {
      id: row.id,
      ok: false,
      error: 'owner_key_missing',
      update_error: error?.message || null,
      row: data,
    }
  }

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
    const httpStatus = res.status
    const responseText = await res.text().catch(() => '')

    if (res.ok) {
      const { data, error } = await markRow(supabase, row.id, {
        status: 'sent',
        attempts,
        sent_at: new Date().toISOString(),
        last_error: null,
        // next_attempt_at NOT NULL 대비: 과거로 두지 않고 현재 유지
        next_attempt_at: row.next_attempt_at || new Date().toISOString(),
      })
      return {
        id: row.id,
        ok: !error,
        status: httpStatus,
        update_error: error?.message || null,
        row: data,
      }
    }

    const permanent =
      httpStatus >= 400 &&
      httpStatus < 500 &&
      httpStatus !== 408 &&
      httpStatus !== 429

    if (permanent || attempts >= MAX_ATTEMPTS) {
      const { data, error } = await markRow(supabase, row.id, {
        status: 'failed',
        attempts,
        last_error: `http_${httpStatus}:${responseText.slice(0, 200)}`,
      })
      return {
        id: row.id,
        ok: false,
        status: httpStatus,
        permanent: true,
        update_error: error?.message || null,
        row: data,
      }
    }

    const next = new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString()
    const { data, error } = await markRow(supabase, row.id, {
      status: 'pending',
      attempts,
      last_error: `http_${httpStatus}:${responseText.slice(0, 200)}`,
      next_attempt_at: next,
    })
    return {
      id: row.id,
      ok: false,
      status: httpStatus,
      next_attempt_at: next,
      update_error: error?.message || null,
      row: data,
    }
  } catch (e) {
    const msg = e?.message || String(e)
    if (attempts >= MAX_ATTEMPTS) {
      const { data, error } = await markRow(supabase, row.id, {
        status: 'failed',
        attempts,
        last_error: msg.slice(0, 300),
      })
      return {
        id: row.id,
        ok: false,
        error: msg,
        permanent: true,
        update_error: error?.message || null,
        row: data,
      }
    }
    const next = new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString()
    const { data, error } = await markRow(supabase, row.id, {
      status: 'pending',
      attempts,
      last_error: msg.slice(0, 300),
      next_attempt_at: next,
    })
    return {
      id: row.id,
      ok: false,
      error: msg,
      next_attempt_at: next,
      update_error: error?.message || null,
      row: data,
    }
  }
}

export async function GET() {
  const traceId = crypto.randomUUID()
  const { getSupabaseAdmin, getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabaseAdmin() || getSupabase()
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
