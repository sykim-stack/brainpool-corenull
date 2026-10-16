// lib/seedPeriod.js
// 씨드 구간 + 배포 페이지 모델
//
// 방 = 계속 사는 공간 (열매 나와도 유지)
// 씨드 = 기간 약속 (시작 글 + 종료일 + 선택 기존 글 + 이후 자동 씨드 글)
// 배포 페이지 = 씨드 직후 생성 → /s/[slug] 로 미리 초대 (메모 + 구간 글)
// 열매 = 종료 시 같은 페이지 status=fruit, 서재·마당 보관
// 해제 = 방 설정에서 중도 종료 (released, 열매 없음)

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
    role,
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
}) {
  const slug = newSlug()
  const { data, error } = await supabase
    .from('corenull_seed_pages')
    .insert({
      slug,
      run_id: runId,
      room_id: roomId,
      house_id: houseId || null,
      owner_key: ownerKey,
      title: title || null,
      memo: memo || '',
      end_date: endDate || null,
      status: 'open',
    })
    .select('*')
    .single()
  if (error) return { error, page: null }
  return { error: null, page: data }
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
