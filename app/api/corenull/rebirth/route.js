// CoreNull - Rebirth API
// 재탄생 = 원본 유지 + 새 포스트 생성
// 원본 수정 절대 금지
// meta.reborn_from = 원본 post_id

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'POST') return handlePost(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { post_id, owner_key, content, room_id } = body

  if (!post_id || !owner_key) {
    return Response.json({ _error: 'post_id_and_owner_key_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 원본 포스트 조회
  const { data: original, error: fetchError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', post_id)
    .single()

  if (fetchError || !original) {
    return Response.json({ _error: 'original_post_not_found', traceId }, { status: 500 })
  }

  // 새 포스트 생성
  // content 없으면 원본 내용 그대로 복사
  const newContent = content || original.content
  const newRoomId = room_id || original.room_id

  const newMeta = {
    ...(original.meta || {}),
    reborn_from: post_id,     // 원본 연결
    archived: false,           // 재탄생은 보관 아님
    reborn_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: newRoomId,
      type: 'post',
      content: newContent,
      meta: newMeta,
      relations: {},
    })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

export { handler as POST }