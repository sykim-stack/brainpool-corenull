// lib/seedPeriod.js
// 씨드 구간(기간) 모델
// - 시작: 포스트 작성 시 seed_start + seed_end_date → room.seed_mode=true, bloom_date=종료일
// - 이후 글: room.seed_mode면 자동 씨드 글 (meta.seed.role=segment)
// - 종료일 경과: 기간 글 phase=fruit, room.seed_mode=false
// - 중도 해제: 방 설정에서 seed_mode=false (열매 없이 닫기)
// 방·포스터는 유지. 열매는 씨드 구간 글에만.

/** 종료일(YYYY-MM-DD)이 지났는지 — 해당 일 종료(UTC 다음날 00:00) 기준 */
export function isSeedEndPassed(bloomDate) {
  if (!bloomDate) return false
  const day = String(bloomDate).slice(0, 10)
  const end = new Date(`${day}T23:59:59.999Z`)
  return Date.now() > end.getTime()
}

/**
 * 종료일이 지난 활성 씨드를 열매로 마감한다.
 * @returns {{ room, finalized: boolean }}
 */
export async function finalizeSeedIfDue(supabase, room) {
  if (!room?.id || !room.seed_mode || !room.bloom_date) {
    return { room, finalized: false }
  }
  if (!isSeedEndPassed(room.bloom_date)) {
    return { room, finalized: false }
  }

  const { data: posts } = await supabase
    .from('messages')
    .select('id, meta, type')
    .eq('room_id', room.id)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')

  const now = new Date().toISOString()
  for (const p of posts || []) {
    const seed = p.meta?.seed
    if (!seed || seed.phase === 'fruit') continue
    const nextMeta = {
      ...(p.meta || {}),
      seed: {
        ...seed,
        phase: 'fruit',
        fruited_at: now,
      },
    }
    await supabase.from('messages').update({ meta: nextMeta }).eq('id', p.id)
  }

  const { data: updated, error } = await supabase
    .from('corenull_rooms')
    .update({ seed_mode: false })
    .eq('id', room.id)
    .select('*')
    .single()

  if (error) return { room, finalized: false }
  return { room: updated || { ...room, seed_mode: false }, finalized: true }
}

/** 포스트 meta에 붙일 씨드 정보 */
export function buildSeedMeta({ role, endDate, startedAt }) {
  return {
    role, // 'start' | 'segment'
    end_date: endDate || null,
    phase: 'growing', // growing | fruit | released
    started_at: startedAt || new Date().toISOString(),
  }
}
