// CoreNull - Archive API
// 포스트 보관 처리
// meta.archived = true 로 상태 변경
// 원본은 절대 삭제하지 않음

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'PATCH') return handlePatch(req, traceId)
  if (req.method === 'GET') return handleGet(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

// 보관 목록 조회
const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const owner_key = searchParams.get('owner_key')

  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('type', 'post')
    .contains('meta', { archived: true })
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

// 보관 처리
const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { post_id, owner_key } = body

  if (!post_id || !owner_key) {
    return Response.json({ _error: 'post_id_and_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 포스트 조회
  const { data: post, error: fetchError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', post_id)
    .single()

  if (fetchError || !post) {
    return Response.json({ _error: 'post_not_found', traceId }, { status: 500 })
  }

  // meta.archived = true 로 업데이트
  const updatedMeta = { ...(post.meta || {}), archived: true }

  const { data, error } = await supabase
    .from('messages')
    .update({ meta: updatedMeta })
    .eq('id', post_id)
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as GET, handler as PATCH }