// lib/roomStage.js
// Adapter Layer — 미래 계약(RoomStage)과 현재 DB 스키마를 연결한다.
//
// UI(Room Card 등)는 항상 이 파일이 반환하는 모양만 본다.
// Phase B에서 corenull_rooms에 실제 seed_started_at/seed_target_date/harvested
// 컬럼이 생기면, 이 파일 내부(adaptRoomStage)만 바꾸면 된다. UI는 한 줄도 안 바뀐다.
//
// RoomStage 계약 (Room Card 스펙, Grok 리뷰 2026-08-02 반영)
//   seed_started_at     timestamp | null   ← 켜짐 = 값 있음
//   seed_target_date    timestamp | null   ← 목표형/성장형 구분
//   participants_preview string[]          ← 참여자 device_id, 미리보기용 최대 3명 (빈 배열 = 참여자 없음)
//   harvested            boolean
//
// 현재(Phase A) 매핑
//   seed_started_at      ← room.seed_mode ? room.created_at : null
//   seed_target_date     ← room.seed_mode ? (room.bloom_date || null) : null
//   participants_preview ← corenull_house_members에서 room_id 매핑된 device_id들 (최대 3개)
//   harvested             ← messages에 (room_id, type='fruit', harvested_at IS NOT NULL) 존재 여부

// 순수 함수 — DB 호출 없음.
export function adaptRoomStage(room, { participantIds, harvested } = {}) {
  const seedOn = !!room.seed_mode
  return {
    seed_started_at: seedOn ? room.created_at : null,
    seed_target_date: seedOn ? (room.bloom_date || null) : null,
    participants_preview: (participantIds || []).slice(0, 3),
    harvested: !!harvested,
  }
}

// stage 계산 (뷰 레이어, 저장 안 함) — Room Card가 배지를 고를 때 쓴다.
// stage: 'none' | 'seed' | 'growth' | 'flower' | 'fruit'
// D-day는 fruit 단계에서는 항상 null (지났으면 완료가 아니라 이미 열매이므로 표시 안 함)
export function computeStage(roomStage) {
  if (roomStage.harvested) return { stage: 'fruit', emoji: '🍎', daysLeft: null }
  if (!roomStage.seed_started_at) return { stage: 'none', emoji: null, daysLeft: null }

  // 성장형: target_date가 없으면 진행률 계산 자체를 스킵하고 고정 표시
  if (!roomStage.seed_target_date) {
    return { stage: 'growth', emoji: '🌿', daysLeft: null }
  }

  // 목표형: 진행률 계산
  const start = new Date(roomStage.seed_started_at).getTime()
  const target = new Date(roomStage.seed_target_date).getTime()
  const now = Date.now()
  const ratio = target > start ? (now - start) / (target - start) : 1
  const daysLeft = Math.ceil((target - now) / (1000 * 60 * 60 * 24))

  if (ratio <= 0) return { stage: 'seed', emoji: '🌱', daysLeft }
  if (ratio < 0.8) return { stage: 'growth', emoji: '🌿', daysLeft }
  if (ratio < 1) return { stage: 'flower', emoji: '🌸', daysLeft }
  // 100%+ = target_date를 이미 지남 → harvested 여부와 무관하게 열매로 표시, D-day 없음
  return { stage: 'fruit', emoji: '🍎', daysLeft: null }
}

// 여러 Room에 RoomStage를 일괄로 붙여준다. (N+1 방지용 배치 조회)
export async function attachRoomStages(supabase, rooms) {
  if (!rooms || rooms.length === 0) return []
  const roomIds = rooms.map((r) => r.id)

  const [{ data: participantRows }, { data: fruitRows }] = await Promise.all([
    supabase
      .from('corenull_house_members')
      .select('room_id, device_id')
      .in('room_id', roomIds)
      .not('room_id', 'is', null),
    supabase
      .from('messages')
      .select('room_id')
      .eq('type', 'fruit')
      .not('harvested_at', 'is', null)
      .in('room_id', roomIds),
  ])

  const participantsByRoom = {}
  for (const row of participantRows || []) {
    if (!participantsByRoom[row.room_id]) participantsByRoom[row.room_id] = []
    participantsByRoom[row.room_id].push(row.device_id)
  }
  const harvestedSet = new Set((fruitRows || []).map((r) => r.room_id))

  return rooms.map((room) => ({
    ...room,
    stage: adaptRoomStage(room, {
      participantIds: participantsByRoom[room.id] || [],
      harvested: harvestedSet.has(room.id),
    }),
  }))
}

// 미디어만 있고 텍스트가 없을 때 자동 캡션
function fallbackCaption(message) {
  const media = message.meta?.media || []
  if (media.length === 0) return ''
  const hasVideo = media.some((m) => m.type === 'video')
  const hasImage = media.some((m) => m.type === 'image')
  if (hasVideo) return '영상을 남겼습니다'
  if (hasImage) return '사진을 남겼습니다'
  return '파일을 추가했습니다'
}

// Room들의 "최근 활동"(latest_message)을 일괄로 붙여준다.
// Room Card 원칙: 방 소개가 아니라 최근 활동을 보여준다.
export async function attachLatestMessages(supabase, rooms) {
  if (!rooms || rooms.length === 0) return rooms
  const roomIds = rooms.map((r) => r.id)

  const { data: msgRows } = await supabase
    .from('messages')
    .select('room_id, content, meta, created_at')
    .in('room_id', roomIds)
    .not('meta', 'cs', '{"deleted":true}')
    .order('created_at', { ascending: false })

  const latestByRoom = {}
  for (const m of msgRows || []) {
    if (!latestByRoom[m.room_id]) latestByRoom[m.room_id] = m
  }

  return rooms.map((room) => {
    const m = latestByRoom[room.id]
    if (!m) return { ...room, latest_message: null }
    const firstImage = m.meta?.media?.find((x) => x.type === 'image')
    const text = (m.content || '').trim() || fallbackCaption(m)
    return {
      ...room,
      latest_message: {
        image_url: firstImage?.url || null,
        text,
        created_at: m.created_at,
      },
    }
  })
}