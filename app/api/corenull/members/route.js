// CoreNull - Members API
// 집/방 멤버 확인 / 추가 / 해지
//
// NOTE(2026-08-30): room_id 스코핑 + 양방향 해지 추가.
//
//   POST   — house 전체 멤버(room_id 없음) 또는 특정 room 참여자
//            (room_id 있음) 추가. 지금까지는 owner만 직접 추가
//            했지만, 보통은 invite 플로우(초대 수락)로 생성된다 —
//            이 POST는 owner가 수동으로 추가하는 보조 경로.
//
//   DELETE — 해지. "참여자 ↔ 방 주인 모두 관계 종료 가능"(양방향
//            일방 해지) 원칙 반영. 요청자가 house owner이거나,
//            요청자 본인이 나가는 경우(본인=device_id) 모두 허용.
//            room_id를 주면 그 room 한정 참여만 해지, 안 주면
//            house 전체(room_id IS NULL) 멤버십을 해지한다 —
//            서로 다른 스코프의 행을 잘못 지우지 않는다.

export const dynamic = 'force-dynamic'

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'GET') return handleGet(req, traceId)
  if (req.method === 'POST') return handlePost(req, traceId)
  if (req.method === 'DELETE') return handleDelete(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

// 멤버 확인
const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const device_id = searchParams.get('device_id')
  const room_id = searchParams.get('room_id')

  if (!house_id) {
    return Response.json({ _error: 'house_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 특정 사람이 이 house(또는 이 room)에 대해 어떤 스코프로든
  // 멤버십을 갖고 있는지 확인. room_id가 주어지면 "그 room 한정
  // 또는 house 전체" 둘 다 유효한 멤버십으로 본다(ADR-ACCESS-001).
  if (device_id) {
    const { data } = await supabase
      .from('corenull_house_members')
      .select('device_id, room_id')
      .eq('house_id', house_id)
      .eq('device_id', device_id)

    const rows = data || []
    const is_member = room_id
      ? rows.some(m => m.room_id === null || m.room_id === room_id)
      : rows.length > 0

    return Response.json({ is_member, rows, traceId })
  }

  // 전체 멤버 목록 — room_id 주어지면 그 room 참여자 + house 전체
  // 멤버 둘 다 포함(그 room에 쓸 수 있는 모든 사람).
  let query = supabase
    .from('corenull_house_members')
    .select('*')
    .eq('house_id', house_id)
    .order('joined_at', { ascending: true })

  const { data, error } = await query
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  const filtered = room_id
    ? (data || []).filter(m => m.room_id === null || m.room_id === room_id)
    : (data || [])

  return Response.json({ data: filtered, traceId })
}

// 멤버 추가 (집주인만 가능) — room_id 있으면 그 room 한정 참여자
const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { house_id, owner_key, device_id, room_id } = body

  if (!house_id || !owner_key || !device_id) {
    return Response.json({ _error: 'house_id_owner_key_device_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // 집주인 검증
  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()

  if (house?.owner_key !== owner_key) {
    return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
  }

  // room_id를 지정했다면 이 house 소속 room인지 확인
  if (room_id) {
    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('id, house_id')
      .eq('id', room_id)
      .single()
    if (!room || room.house_id !== house_id) {
      return Response.json({ _error: 'room_not_in_house', traceId }, { status: 500 })
    }
  }

  // 같은 스코프로 이미 등록돼 있는지 확인 (room_id까지 일치해야 중복으로 본다)
  const { data: existingRows } = await supabase
    .from('corenull_house_members')
    .select('device_id, room_id')
    .eq('house_id', house_id)
    .eq('device_id', device_id)

  const alreadyScoped = (existingRows || []).some(m => m.room_id === (room_id || null))
  if (alreadyScoped) {
    return Response.json({ _error: 'already_member', traceId }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('corenull_house_members')
    .insert({ house_id, device_id, room_id: room_id || null })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data, traceId })
}

// 멤버 해지 — house owner 또는 본인(자진 탈퇴) 모두 가능.
// room_id 있으면 그 room 참여만 해지, 없으면 house 전체 멤버십 해지.
const handleDelete = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const house_id = searchParams.get('house_id')
  const requester_key = searchParams.get('owner_key') // 요청자 — house owner 또는 본인
  const device_id = searchParams.get('device_id')      // 해지 대상
  const room_id = searchParams.get('room_id')           // 없으면 house 전체 스코프

  if (!house_id || !requester_key || !device_id) {
    return Response.json({ _error: 'house_id_owner_key_device_id_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', house_id)
    .single()

  const isHouseOwner = house?.owner_key === requester_key
  const isSelf = requester_key === device_id

  // 참여자 ↔ 방 주인 모두 관계 종료 가능 — 양쪽 다 아니면 거절.
  if (!isHouseOwner && !isSelf) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
  }

  let query = supabase
    .from('corenull_house_members')
    .delete()
    .eq('house_id', house_id)
    .eq('device_id', device_id)

  // room_id 스코핑: 지정 안 하면 house 전체(room_id IS NULL) 멤버십만
  // 지운다 — room 한정 참여 행을 실수로 같이 지우지 않는다.
  query = room_id ? query.eq('room_id', room_id) : query.is('room_id', null)

  const { error } = await query

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({ data: { deleted: true }, traceId })
}

export { handler as GET, handler as POST, handler as DELETE }