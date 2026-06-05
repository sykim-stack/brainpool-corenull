// CoreNull - Post API
// ?ъ뒪???묒꽦 / 議고쉶 (Message type=post|event)
// 諛⑸Ц ??Footprint ?먮룞 湲곕줉
 
const handler = async (req) => {
  const traceId = crypto.randomUUID()
 
  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
 
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}
 
const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const room_id = searchParams.get('room_id')
  const owner_key = searchParams.get('owner_key') // Footprint 湲곕줉??(?좏깮)
 
  if (!room_id) {
    return Response.json({ _error: 'room_id_required', traceId }, { status: 500 })
  }
 
  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
 
  // 諛⑸Ц ??Footprint ?먮룞 湲곕줉
  if (owner_key) {
    const { error: fpError } = await supabase
      .from('corenull_footprints')
      .insert({ owner_key, room_id })
    console.log('footprint error:', fpError)
  }
 
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', room_id)
    .in('type', ['post', 'event'])
    .order('created_at', { ascending: false })
 
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
 
  return Response.json({ data, traceId })
}
 
const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, content, meta, type } = body
 
  if (!room_id || !owner_key || !content) {
    return Response.json({ _error: 'room_id_owner_key_content_required', traceId }, { status: 500 })
  }
 
  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
 
  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id,
      type: type || 'post',
      content,
      meta: meta || {},
      relations: {},
    })
    .select()
    .single()
 
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
 
  return Response.json({ data, traceId })
}
 
export { handler as GET, handler as POST }
