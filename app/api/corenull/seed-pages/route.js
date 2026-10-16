// app/api/corenull/seed-pages/route.js
// 씨드 배포 페이지 (초대장)
// GET  ?slug=   → 공개 조회 (인증 불필요)
// GET  ?room_id= → 방의 open/최근 페이지
// POST body: { room_id, owner_key, memo?, title?, end_date? } → 초대장 생성
// PATCH body: { slug|id, memo, title, owner_key } → owner만 메모 수정

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}`
  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  if (req.method === 'PATCH') return handlePatch(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 405 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const room_id = searchParams.get('room_id')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  if (slug) {
    const { data: page, error } = await supabase
      .from('corenull_seed_pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    if (!page) return Response.json({ _error: 'not_found', traceId }, { status: 404 })

    if (page.status === 'open' && page.end_date) {
      const { isSeedEndPassed, finalizeSeedIfDue } = await import('@/lib/seedPeriod')
      if (isSeedEndPassed(page.end_date)) {
        const { data: room } = await supabase
          .from('corenull_rooms')
          .select('*')
          .eq('id', page.room_id)
          .maybeSingle()
        if (room) await finalizeSeedIfDue(supabase, room)
        const { data: refreshed } = await supabase
          .from('corenull_seed_pages')
          .select('*')
          .eq('id', page.id)
          .maybeSingle()
        if (refreshed) Object.assign(page, refreshed)
      }
    }

    const { listSeedPosts } = await import('@/lib/seedPeriod')
    const posts = await listSeedPosts(supabase, page.room_id, page.run_id)

    let room_name = null
    let house_title = null
    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('room_name, house_id')
      .eq('id', page.room_id)
      .maybeSingle()
    if (room) {
      room_name = room.room_name
      if (room.house_id) {
        const { data: house } = await supabase
          .from('corenull_houses')
          .select('title')
          .eq('id', room.house_id)
          .maybeSingle()
        house_title = house?.title || null
      }
    }

    return Response.json({
      data: {
        page,
        posts,
        room_name,
        house_title,
        share_path: `/s/${page.slug}`,
      },
      traceId,
    })
  }

  if (room_id) {
    const { data: pages, error } = await supabase
      .from('corenull_seed_pages')
      .select('*')
      .eq('room_id', room_id)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data: pages || [], traceId })
  }

  return Response.json({ _error: 'slug_or_room_id_required', traceId }, { status: 400 })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, memo, title, end_date } = body
  if (!room_id || !owner_key) {
    return Response.json({ _error: 'room_id_owner_key_required', traceId }, { status: 400 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: room } = await supabase
    .from('corenull_rooms')
    .select('id, house_id, room_name, seed_mode, bloom_date')
    .eq('id', room_id)
    .maybeSingle()
  if (!room) return Response.json({ _error: 'room_not_found', traceId }, { status: 404 })
  if (!room.seed_mode) {
    return Response.json({ _error: 'room_not_in_seed_mode', traceId }, { status: 400 })
  }

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', room.house_id)
    .maybeSingle()
  if (!house || house.owner_key !== owner_key) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 403 })
  }

  const { getOpenSeedPage, createSeedPage, newRunId } = await import('@/lib/seedPeriod')
  const existing = await getOpenSeedPage(supabase, room_id)
  if (existing) return Response.json({ data: existing, share_path: `/s/${existing.slug}`, traceId })

  const runId = newRunId()
  const { error, page } = await createSeedPage(supabase, {
    roomId: room_id,
    houseId: room.house_id,
    ownerKey: owner_key,
    runId,
    endDate: end_date || room.bloom_date || null,
    title: title || room.room_name || null,
    memo: memo || '',
  })
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data: page, share_path: `/s/${page.slug}`, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = await req.json().catch(() => ({}))
  const { slug, id, memo, title, owner_key } = body
  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 400 })
  }
  if (!slug && !id) {
    return Response.json({ _error: 'slug_or_id_required', traceId }, { status: 400 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  let q = supabase.from('corenull_seed_pages').select('*')
  if (id) q = q.eq('id', id)
  else q = q.eq('slug', slug)
  const { data: page, error: findErr } = await q.maybeSingle()
  if (findErr) return Response.json({ _error: findErr.message, traceId }, { status: 500 })
  if (!page) return Response.json({ _error: 'not_found', traceId }, { status: 404 })
  if (page.owner_key !== owner_key) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 403 })
  }

  const update = {}
  if (memo !== undefined) update.memo = String(memo)
  if (title !== undefined) update.title = title
  if (Object.keys(update).length === 0) {
    return Response.json({ data: page, traceId })
  }

  const { data, error } = await supabase
    .from('corenull_seed_pages')
    .update(update)
    .eq('id', page.id)
    .select('*')
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export { handler as GET, handler as POST, handler as PATCH }
