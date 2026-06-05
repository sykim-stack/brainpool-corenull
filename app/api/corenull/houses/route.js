// CoreNull - House API

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const owner_key = searchParams.get('owner_key')
  if (!owner_key) return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('corenull_houses')
    .select('*, corenull_rooms(*)')
    .eq('owner_key', owner_key)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { owner_key, title, description, slug, primary_language } = body

  if (!owner_key || !title) return Response.json({ _error: 'owner_key_and_title_required', traceId }, { status: 500 })

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data, error } = await supabase
    .from('corenull_houses')
    .insert({ owner_key, title, description, slug: slug || null, primary_language: primary_language || 'ko' })
    .select()
    .single()

  console.log('data:', data, 'error:', error)

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST }