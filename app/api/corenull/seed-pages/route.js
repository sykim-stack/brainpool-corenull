// app/api/corenull/seed-pages/route.js
// 씨드 배포 페이지 (초대장)
// GET  ?slug=   → 공개 조회
// GET  ?room_id= → 방의 페이지 목록
// POST body: { room_id, owner_key, start_post_id, end_date, memo?, title? } → run 시작 + 초대장
// PATCH body: { slug|id, memo, title, owner_key }

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

    const { listSeedPosts, tagPostsFromStart } = await import('@/lib/seedPeriod')
    let posts = await listSeedPosts(supabase, page.room_id, page.run_id, {
      startAt: page.start_at || null,
      startPostId: page.start_post_id || null,
    })
    if (
      page.status === 'open' &&
      posts.length === 0 &&
      page.start_post_id &&
      page.run_id
    ) {
      let startAt = page.start_at || null
      if (!startAt) {
        const { data: sp } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', page.start_post_id)
          .maybeSingle()
        startAt = sp?.created_at || null
      }
      if (startAt) {
        await tagPostsFromStart(supabase, {
          roomId: page.room_id,
          runId: page.run_id,
          startPostId: page.start_post_id,
          startAt,
          endDate: page.end_date || null,
        })
        posts = await listSeedPosts(supabase, page.room_id, page.run_id, {
          startAt,
          startPostId: page.start_post_id,
        })
      }
    }

    let room_name = null
    let house_title = null
    let cover_image_url = null
    let cover_image_position = null
    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('room_name, house_id, cover_image_url, cover_image_position')
      .eq('id', page.room_id)
      .maybeSingle()
    if (room) {
      room_name = room.room_name
      cover_image_url = room.cover_image_url || null
      cover_image_position = room.cover_image_position || null
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
        cover_image_url,
        cover_image_position,
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
  const { room_id, owner_key, memo, title, end_date, start_post_id } = body
  if (!room_id || !owner_key) {
    return Response.json({ _error: 'room_id_owner_key_required', traceId }, { status: 400 })
  }
  if (!start_post_id) {
    return Response.json({ _error: 'start_post_id_required', traceId }, { status: 400 })
  }
  if (!end_date) {
    return Response.json({ _error: 'end_date_required', traceId }, { status: 400 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: room, error: roomErr } = await supabase
    .from('corenull_rooms')
    .select('*, corenull_houses(owner_key)')
    .eq('id', room_id)
    .maybeSingle()
  if (roomErr || !room) return Response.json({ _error: 'room_not_found', traceId }, { status: 404 })
  const houseOwner = room.corenull_houses?.owner_key
  if (houseOwner !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 403 })
  }

  const { startSeedRun } = await import('@/lib/seedPeriod')
  const result = await startSeedRun(supabase, {
    roomId: room_id,
    ownerKey: owner_key,
    startPostId: start_post_id,
    endDate: end_date,
    memo: memo || '',
    title: title || room.room_name || null,
  })
  if (result.error) return Response.json({ _error: result.error, traceId }, { status: 400 })
  return Response.json({ data: result.page, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { slug, id, memo, title, owner_key } = body
  if (!owner_key) return Response.json({ _error: 'owner_key_required', traceId }, { status: 400 })
  if (!slug && !id) return Response.json({ _error: 'slug_or_id_required', traceId }, { status: 400 })

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  let q = supabase.from('corenull_seed_pages').select('*')
  if (slug) q = q.eq('slug', slug)
  else q = q.eq('id', id)
  const { data: page, error } = await q.maybeSingle()
  if (error || !page) return Response.json({ _error: 'not_found', traceId }, { status: 404 })

  const { data: room } = await supabase
    .from('corenull_rooms')
    .select('house_id, corenull_houses(owner_key)')
    .eq('id', page.room_id)
    .maybeSingle()
  if (room?.corenull_houses?.owner_key !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 403 })
  }

  const update = {}
  if (memo !== undefined) update.memo = memo
  if (title !== undefined) update.title = title
  const { data, error: uErr } = await supabase
    .from('corenull_seed_pages')
    .update(update)
    .eq('id', page.id)
    .select()
    .single()
  if (uErr) return Response.json({ _error: uErr.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

export const GET = handler
export const POST = handler
export const PATCH = handler
