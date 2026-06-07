// CoreNull - Comments API
// 댓글 작성 / 조회
// messages 테이블 공유 (type: "comment")
// relations.parent_id = 포스트ID

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const post_id = searchParams.get('post_id')

  if (!post_id) {
    return Response.json({ _error: 'post_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('type', 'comment')
    .contains('relations', { parent_id: post_id })
    .order('created_at', { ascending: true })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { post_id, room_id, owner_key, content } = body

  if (!post_id || !room_id || !owner_key || !content) {
    return Response.json({ _error: 'post_id_room_id_owner_key_content_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id,
      type: 'comment',
      content,
      meta: {},
      relations: { parent_id: post_id },
    })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST }