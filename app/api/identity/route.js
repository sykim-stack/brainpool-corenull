// app/api/identity/route.js
// Identity Layer — owner_key 기기 동기화
// link-code: 코드 발급
// link-confirm: 코드 확인 + owner_key 반환
// Message 시스템 외부 — 공통 Module

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (req.method === 'POST' && action === 'link-code')    return handleLinkCode(req, traceId)
  if (req.method === 'POST' && action === 'link-confirm') return handleLinkConfirm(req, traceId)

  return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
}

// 코드 발급 — 6자리 + 5분 만료
const handleLinkCode = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { owner_key } = body

  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 6자리 랜덤 숫자 코드
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  // 기존 미사용 코드 삭제 (owner_key당 하나만)
  await supabase
    .from('link_codes')
    .delete()
    .eq('owner_key', owner_key)
    .is('used_at', null)

  const { data, error } = await supabase
    .from('link_codes')
    .insert({ code, owner_key, expires_at })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data: { code: data.code, expires_at: data.expires_at }, traceId })
}

// 코드 확인 + owner_key 반환
const handleLinkConfirm = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { code } = body

  if (!code) {
    return Response.json({ _error: 'code_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: link, error } = await supabase
    .from('link_codes')
    .select('*')
    .eq('code', code)
    .is('used_at', null)
    .single()

  if (error || !link) {
    return Response.json({ _error: 'invalid_or_expired_code', traceId }, { status: 500 })
  }

  // 만료 확인
  if (new Date(link.expires_at) < new Date()) {
    return Response.json({ _error: 'code_expired', traceId }, { status: 500 })
  }

  // 단일 사용 처리
  await supabase
    .from('link_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', link.id)

  return Response.json({ data: { owner_key: link.owner_key }, traceId })
}

export { handler as POST }