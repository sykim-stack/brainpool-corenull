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

/**
 * 씨드 run 시작 (글 작성 직후 또는 기존 글 선택).
 * - open 페이지 있으면 기존 반환
 * - 없으면 페이지 생성 + 방 seed_mode + 범위 태깅
 */
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

  const { error: pageErr, page } = await createSeedPage(supabase, {
    roomId,
    houseId,
    ownerKey,
    runId,
    endDate: String(endDate).slice(0, 10),
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
      bloom_date: String(endDate).slice(0, 10),
    })
    .eq('id', roomId)

  await tagPostsFromStart(supabase, {
    roomId,
    runId,
    startPostId,
    startAt,
    endDate: String(endDate).slice(0, 10),
  })

  return { error: null, page, alreadyOpen: false }
}

/** 진행 중 새 글에 현재 open run 태그 */
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
    return { room, finalized: false, page: null }
  }
  if (!isSeedEndPassed(room.bloom_date)) {
    return { room, finalized: false, page: null }
  }

  const page = await getOpenSeedPage(supabase, room.id)
  const runId = page?.run_id || null
  const now = new Date().toISOString()

  const { data: posts } = await supabase
    .from('messages')
    .select('id, meta, type')
    .eq('room_id', room.id)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')

  for (const p of posts || []) {
    const seed = p.meta?.seed
    if (!seed) continue
    if (runId && seed.run_id && seed.run_id !== runId) continue
    if (seed.phase === 'fruit' || seed.phase === 'released') continue
    await supabase
      .from('messages')
      .update({
        meta: {
          ...(p.meta || {}),
          seed: { ...seed, phase: 'fruit', fruited_at: now },
        },
      })
      .eq('id', p.id)
  }

  if (page) {
    await supabase
      .from('corenull_seed_pages')
      .update({ status: 'fruit', fruited_at: now })
      .eq('id', page.id)
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

export async function listSeedPosts(supabase, roomId, runId) {
  const { data } = await supabase
    .from('messages')
    .select('id, content, meta, created_at, type, owner_key')
    .eq('room_id', roomId)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')
    .order('created_at', { ascending: true })

  const rows = data || []
  if (!runId) return rows.filter((p) => p.meta?.seed)
  return rows.filter((p) => p.meta?.seed?.run_id === runId)
}
