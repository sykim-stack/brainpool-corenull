// lib/corehubOutbox.js
// CoreHub Fact 전송을 직행 fetch가 아니라 outbox에 적재한다.
// flush(/api/corenull/outbox/flush)가 재시도·idempotency를 담당한다.
//
// 원칙: CoreNull 쓰기 경로 실패가 사용자 응답을 막지 않는다.
// enqueue 실패는 로그만 남기고 무시한다.

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{
 *   fact_type: string,
 *   owner_key: string,
 *   message_id?: string|null,
 *   payload?: Record<string, unknown>,
 *   idempotency_key?: string|null,
 * }} opts
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
export async function enqueueFact(supabase, opts) {
  const fact_type = opts?.fact_type
  const owner_key = opts?.owner_key
  if (!supabase || !fact_type || !owner_key) {
    return { ok: false, error: 'fact_type_owner_key_required' }
  }

  const message_id = opts.message_id || null
  const payload = opts.payload || {}
  const idempotency_key =
    opts.idempotency_key ||
    (message_id
      ? `corenull:${fact_type}:${message_id}:v1`
      : `corenull:${fact_type}:${owner_key}:${payload.room_id || payload.run_id || crypto.randomUUID()}:v1`)

  try {
    const { data, error } = await supabase
      .from('corenull_message_outbox')
      .insert({
        status: 'pending',
        attempts: 0,
        fact_type,
        owner_key,
        message_id,
        idempotency_key,
        payload: {
          ...payload,
          house_id: payload.house_id || null,
        },
      })
      .select('id')
      .maybeSingle()

    if (error) {
      // unique(idempotency_key) 충돌 등은 이미 적재된 것으로 본다
      if (String(error.message || '').includes('duplicate') || error.code === '23505') {
        return { ok: true, id: null }
      }
      console.error('[corehubOutbox] enqueue failed', fact_type, error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id || null }
  } catch (e) {
    const msg = e?.message || String(e)
    console.error('[corehubOutbox] enqueue exception', fact_type, msg)
    return { ok: false, error: msg }
  }
}
