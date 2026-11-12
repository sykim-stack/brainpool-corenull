// lib/seedPeriod.js
// 씨드 구간 + 배포 페이지 모델
//
// 방 = 계속 사는 공간 (열매 나와도 유지)
// 씨드 = 시작 게시글 + 종료일 + 그 사이(이후) 글
// 배포 페이지 = 씨드 시작 시 생성 → /s/[slug]
// 열매 = 종료 시 status=fruit → 마당·거실·서재
// 해제 = 중도 종료 (released, 열매 없음)

export function isSeedEndPassed(bloomDate) {
  if (!bloomDate) return false
  const day = String(bloomDate).slice(0, 10)
  const end = new Date(`${day}T23:59:59.999Z`)
  return Date.now() > end.getTime()
}

export function newRunId() {
  return crypto.randomUUID()
}

export function newSlug() {
  const raw =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return raw.slice(0, 12)
}

export function buildSeedMeta({ role, endDate, runId, startedAt }) {
  return {
    role: role || 'member',
    run_id: runId,
    end_date: endDate || null,
    phase: 'growing',
    started_at: startedAt || new Date().toISOString(),
  }
}

export async function getOpenSeedPage(supabase, roomId) {
  const { data } = await supabase
    .from('corenull_seed_pages')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

export async function createSeedPage(supabase, {
  roomId,
  houseId,
  ownerKey,
  runId,
  endDate,
  title,
  memo,
  startPostId,
  startAt,
}) {
  const slug = newSlug()
  const row = {
    slug,
    run_id: runId,
    room_id: roomId,
    house_id: houseId || null,
    owner_key: ownerKey,
    title: title || null,
    memo: memo || '',
    end_date: endDate || null,
    status: 'open',
  }
  if (startPostId) row.start_post_id = startPostId
  if (startAt) row.start_at = startAt

  const { data, error } = await supabase
    .from('corenull_seed_pages')
    .insert(row)
    .select('*')
    .single()
  if (error) return { error, page: null }
  return { error: null, page: data }
}

/** 시작글 이후(포함) 글에 meta.seed 태깅. 이미 다른 run이면 건너뜀. */
export async function tagPostsFromStart(supabase, {
  roomId,
  runId,
  startPostId,
  startAt,
  endDate,
}) {
  const { data: posts } = await supabase
    .from('messages')
    .select('id, meta, created_at, type')
    .eq('room_id', roomId)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')
    .gte('created_at', startAt)
    .order('created_at', { ascending: true })

  const now = new Date().toISOString()
  let tagged = 0
  for (const p of posts || []) {
    const existing = p.meta?.seed
    if (existing?.run_id && existing.run_id !== runId) continue
    if (existing?.phase === 'fruit' || existing?.phase === 'released') continue
    const role = p.id === startPostId ? 'start' : 'member'
    const seed = buildSeedMeta({ role, endDate, runId, startedAt: existing?.started_at || now })
    await supabase
      .from('messages')
      .update({
        meta: {
          ...(p.meta || {}),
          seed,
        },
      })
      .eq('id', p.id)
    tagged += 1
  }
  return { tagged }
}

export async function startSeedRun(supabase, {
  roomId,
  houseId,
  ownerKey,
  startPostId,
  endDate,
  title,
  memo,
}) {
  if (!roomId || !ownerKey || !startPostId || !endDate) {
    return { error: { message: 'room_id_owner_key_start_post_id_end_date_required' }, page: null }
  }

  const existing = await getOpenSeedPage(supabase, roomId)
  if (existing) {
    return { error: null, page: existing, alreadyOpen: true }
  }

  const { data: startPost, error: postErr } = await supabase
    .from('messages')
    .select('id, room_id, created_at, meta')
    .eq('id', startPostId)
    .maybeSingle()
  if (postErr || !startPost) {
    return { error: { message: 'start_post_not_found' }, page: null }
  }
  if (startPost.room_id !== roomId) {
    return { error: { message: 'start_post_room_mismatch' }, page: null }
  }

  const runId = newRunId()
  const startAt = startPost.created_at
  const endDateStr = String(endDate).slice(0, 10)

  const { error: pageErr, page } = await createSeedPage(supabase, {
    roomId,
    houseId,
    ownerKey,
    runId,
    endDate: endDateStr,
    title,
    memo: memo || '',
    startPostId,
    startAt,
  })
  if (pageErr) return { error: pageErr, page: null }

  await supabase
    .from('corenull_rooms')
    .update({
      seed_mode: true,
      bloom_date: endDateStr,
    })
    .eq('id', roomId)

  await tagPostsFromStart(supabase, {
    roomId,
    runId,
    startPostId,
    startAt,
    endDate: endDateStr,
  })

  // CoreHub: 직행 전송 대신 outbox (실패 시 재시도)
  try {
    const { enqueueFact } = await import('@/lib/corehubOutbox')
    await enqueueFact(supabase, {
      fact_type: 'space.seed.created',
      owner_key: ownerKey,
      message_id: startPostId,
      idempotency_key: `corenull:space.seed.created:run:${runId}:v1`,
      payload: {
        room_id: roomId,
        house_id: houseId || null,
        run_id: runId,
        start_post_id: startPostId,
        bloom_date: endDateStr,
        seed_page_id: page?.id || null,
        seed_page_slug: page?.slug || null,
      },
    })
  } catch (e) {
    console.error('[seedPeriod] enqueue seed fact failed', e?.message || e)
  }

  return { error: null, page, alreadyOpen: false }
}

export async function attachSeedMetaIfActive(supabase, room, postId, existingMeta) {
  if (!room?.seed_mode || !room.id || !postId) {
    return existingMeta || {}
  }
  const page = await getOpenSeedPage(supabase, room.id)
  if (!page?.run_id) return existingMeta || {}

  if (page.end_date && isSeedEndPassed(page.end_date)) {
    await finalizeSeedIfDue(supabase, { ...room, bloom_date: page.end_date || room.bloom_date })
    return existingMeta || {}
  }

  const seed = buildSeedMeta({
    role: 'member',
    endDate: page.end_date || room.bloom_date,
    runId: page.run_id,
  })
  return {
    ...(existingMeta || {}),
    seed,
  }
}

export async function finalizeSeedIfDue(supabase, room) {
  if (!room?.id || !room.seed_mode || !room.bloom_date) {
    return { room, finalized: false }
  }
  if (!isSeedEndPassed(room.bloom_date)) {
    return { room, finalized: false }
  }

  const page = await getOpenSeedPage(supabase, room.id)
  const now = new Date().toISOString()
  const runId = page?.run_id || null

  const { data: posts } = await supabase
    .from('messages')
    .select('id, meta')
    .eq('room_id', room.id)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')

  for (const post of posts || []) {
    const seed = post.meta?.seed
    if (!seed) continue
    if (runId && seed.run_id && seed.run_id !== runId) continue
    if (seed.phase === 'fruit' || seed.phase === 'released') continue
    await supabase
      .from('messages')
      .update({
        meta: {
          ...(post.meta || {}),
          seed: { ...seed, phase: 'fruit', fruited_at: now },
        },
      })
      .eq('id', post.id)
  }

  if (page) {
    await supabase
      .from('corenull_seed_pages')
      .update({ status: 'fruit', fruited_at: now })
      .eq('id', page.id)
  }

  const fruitContent =
    page?.title || room.room_name
      ? `🍎 ${(page?.title || room.room_name || '').trim()} 열매`
      : '🍎 열매'

  const houseId = room.house_id || page?.house_id || null
  const ownerKey = page?.owner_key || null

  const { data: fruitRow, error: fruitInsertErr } = await supabase
    .from('messages')
    .insert({
      room_id: room.id,
      house_id: houseId,
      owner_key: ownerKey,
      type: 'fruit',
      content: fruitContent,
      meta: {
        seed: {
          role: 'fruit',
          run_id: runId,
          phase: 'fruit',
          fruited_at: now,
          end_date: page?.end_date || room.bloom_date,
        },
        seed_page_slug: page?.slug || null,
        seed_page_id: page?.id,
      },
      relations: {},
    })
    .select('id')
    .maybeSingle()

  if (fruitInsertErr) {
    console.error('[seedPeriod] fruit message insert failed', fruitInsertErr.message)
  }

  // CoreHub: 열매 Fact도 outbox (직행 전송 제거)
  if (ownerKey) {
    try {
      const { enqueueFact } = await import('@/lib/corehubOutbox')
      await enqueueFact(supabase, {
        fact_type: 'space.fruit.created',
        owner_key: ownerKey,
        message_id: fruitRow?.id || null,
        idempotency_key: runId
          ? `corenull:space.fruit.created:run:${runId}:v1`
          : `corenull:space.fruit.created:room:${room.id}:${now}:v1`,
        payload: {
          room_id: room.id,
          house_id: houseId,
          run_id: runId,
          fruit_message_id: fruitRow?.id || null,
          seed_page_id: page?.id || null,
          seed_page_slug: page?.slug || null,
          bloom_date: page?.end_date || room.bloom_date,
          fruited_at: now,
        },
      })
    } catch (e) {
      console.error('[seedPeriod] enqueue fruit fact failed', e?.message || e)
    }
  }

  const { data: updated, error } = await supabase
    .from('corenull_rooms')
    .update({ seed_mode: false })
    .eq('id', room.id)
    .select('*')
    .single()

  if (error) return { room, finalized: false, page }
  return {
    room: updated || { ...room, seed_mode: false },
    finalized: true,
    page: page ? { ...page, status: 'fruit', fruited_at: now } : null,
  }
}

export async function releaseSeed(supabase, roomId) {
  const now = new Date().toISOString()
  const page = await getOpenSeedPage(supabase, roomId)
  const runId = page?.run_id || null

  const { data: posts } = await supabase
    .from('messages')
    .select('id, meta')
    .eq('room_id', roomId)
    .in('type', ['post', 'fruit'])

  for (const post of posts || []) {
    const seed = post.meta?.seed
    if (!seed) continue
    if (runId && seed.run_id && seed.run_id !== runId) continue
    if (seed.phase === 'fruit' || seed.phase === 'released') continue
    await supabase
      .from('messages')
      .update({
        meta: {
          ...(post.meta || {}),
          seed: { ...seed, phase: 'released', released_at: now },
        },
      })
      .eq('id', post.id)
  }

  if (page) {
    await supabase
      .from('corenull_seed_pages')
      .update({ status: 'released', released_at: now })
      .eq('id', page.id)
  }

  await supabase
    .from('corenull_rooms')
    .update({ seed_mode: false })
    .eq('id', roomId)

  return { page }
}

export async function listSeedPosts(supabase, roomId, runId, opts = {}) {
  // 초대장 = 씨드 생애 기록 (시작글 ~ 현재).
  // run은 실행 단위일 뿐 씨드 정체성이 아님. 재시작·해제 후에도 성장 역사는 하나.
  // 정렬: 공지 최상단 → 최근 위 → 시작(태어난 날) 아래
  const { data } = await supabase
    .from('messages')
    .select('id, content, meta, created_at, type, owner_key')
    .eq('room_id', roomId)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')
    .order('created_at', { ascending: true })

  const rows = data || []
  let startAt = opts.startAt || null
  const startPostId = opts.startPostId || null
  if (!startAt && startPostId) {
    const hit = rows.find((p) => p.id === startPostId)
    if (hit) startAt = hit.created_at
  }

  let filtered = []
  if (startAt) {
    const t0 = new Date(startAt).getTime()
    filtered = rows.filter((p) => {
      // 시작 시각 이후 성장 기록. 씨드 무관 fruit(다른 경로)만 제외
      if (p.type === 'fruit' && !p.meta?.seed) return false
      return new Date(p.created_at).getTime() >= t0
    })
  } else if (runId) {
    // start_at 없는 레거시 페이지: run 폴백
    filtered = rows.filter((p) => p.meta?.seed?.run_id === runId)
  } else if (startPostId) {
    filtered = rows.filter((p) => p.id === startPostId)
  } else {
    filtered = rows.filter((p) => p.meta?.seed)
  }

  const seen = new Set()
  filtered = filtered.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return filtered.slice().sort((a, b) => {
    const pa = a.meta?.pinned ? 1 : 0
    const pb = b.meta?.pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    if (ta !== tb) return tb - ta
    const ra = a.meta?.seed?.role === 'start' ? 1 : 0
    const rb = b.meta?.seed?.role === 'start' ? 1 : 0
    return ra - rb
  })
}
