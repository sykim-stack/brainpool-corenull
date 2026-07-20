// app/api/identity/route.js
// Identity Layer — LinkCredential (target: invite | recover) 통합
// 개념적으로 Platform-level Identity (코드 위치는 corenull 저장소, 소유는 전체 Core 공통)
//
// link-code    : 코드 발급 (target: 'invite' | 'recover', 기본값 'recover' — 기존 호출 호환)
// link-confirm : 코드 확인 (target별 분기)
//   - recover → { owner_key } 반환 (기존 동작과 100% 동일, 하위 호환)
//   - invite  → room_id 대상 house에 멤버 등록 + { house_id, room_id } 반환
//
// 명시적 미변경 사항 (작업지시서 §4 준수):
//   - 기존 room 초대 흐름 (corenull_invite_tokens / /api/corenull/invite) 은 손대지 않음
//   - owner_key 자체의 생성/삭제 로직 미변경 (recover는 owner_key를 새로 만들지 않고, 기존 값을 그대로 반환)

export const dynamic = 'force-dynamic'

const VALID_TARGETS = ['invite', 'recover']

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (req.method === 'POST' && action === 'link-code')    return handleLinkCode(req, traceId)
  if (req.method === 'POST' && action === 'link-confirm') return handleLinkConfirm(req, traceId)

  return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
}

// 코드 발급 — 6자리 + 5분 만료
const handleLinkCode = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { owner_key, target, room_id } = body

  if (!owner_key) {
    return Response.json({ _error: 'owner_key_required', traceId }, { status: 500 })
  }

  const resolvedTarget = target || 'recover'
  if (!VALID_TARGETS.includes(resolvedTarget)) {
    return Response.json({ _error: 'invalid_target', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  // invite: room_id 필수 + 발급자가 해당 room이 속한 house의 owner인지 검증
  // (기존 corenull_invite_tokens 흐름과 동일한 권한 규칙 — 그 흐름 자체는 건드리지 않음)
  if (resolvedTarget === 'invite') {
    if (!room_id) {
      return Response.json({ _error: 'room_id_required_for_invite', traceId }, { status: 500 })
    }

    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('house_id')
      .eq('id', room_id)
      .single()
    if (!room) {
      return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
    }

    const { data: house } = await supabase
      .from('corenull_houses')
      .select('owner_key')
      .eq('id', room.house_id)
      .single()
    if (house?.owner_key !== owner_key) {
      return Response.json({ _error: 'not_house_owner', traceId }, { status: 500 })
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  // 기존 미사용 코드 삭제 — owner_key + target 조합당 하나만 유효
  // (recover 코드와 invite 코드를 동시에 발급/보유할 수 있도록 target도 조건에 포함)
  await supabase
    .from('link_codes')
    .delete()
    .eq('owner_key', owner_key)
    .eq('target', resolvedTarget)
    .is('used_at', null)

  const { data, error } = await supabase
    .from('link_codes')
    .insert({
      code,
      owner_key,
      target: resolvedTarget,
      expires_at,
      room_id: resolvedTarget === 'invite' ? room_id : null,
    })
    .select()
    .single()

  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  return Response.json({
    data: { code: data.code, target: data.target, expires_at: data.expires_at },
    traceId,
  })
}

// 코드 확인 — target별 분기 처리
const handleLinkConfirm = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { code, receiver_owner_key } = body

  if (!code) {
    return Response.json({ _error: 'code_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: link, error } = await supabase
    .from('link_codes')
    .select('*')
    .eq('code', code)
    .is('used_at', null)
    .single()

  if (error || !link) {
    return Response.json({ _error: 'invalid_or_expired_code', traceId }, { status: 500 })
  }

  if (new Date(link.expires_at) < new Date()) {
    return Response.json({ _error: 'code_expired', traceId }, { status: 500 })
  }

  // recover — 기존 동작과 완전히 동일 (owner_key 그대로 반환, 새로 생성하지 않음)
  if (link.target === 'recover') {
    await supabase
      .from('link_codes')
      .update({
        used_at: new Date().toISOString(),
        receiver_owner_key: receiver_owner_key || null,
      })
      .eq('id', link.id)

    return Response.json({ data: { target: 'recover', owner_key: link.owner_key }, traceId })
  }

  // invite — room이 속한 house에 멤버 등록
  if (link.target === 'invite') {
    if (!receiver_owner_key) {
      return Response.json({ _error: 'receiver_owner_key_required', traceId }, { status: 500 })
    }
    if (receiver_owner_key === link.owner_key) {
      return Response.json({ _error: 'owner_cannot_join', traceId }, { status: 500 })
    }

    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('house_id')
      .eq('id', link.room_id)
      .single()
    if (!room) {
      return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
    }

    const { data: existing } = await supabase
      .from('corenull_house_members')
      .select('device_id')
      .eq('house_id', room.house_id)
      .eq('device_id', receiver_owner_key)
      .single()

    if (!existing) {
      await supabase
        .from('corenull_house_members')
        .insert({ house_id: room.house_id, device_id: receiver_owner_key })
    }

    await supabase
      .from('link_codes')
      .update({
        used_at: new Date().toISOString(),
        receiver_owner_key,
      })
      .eq('id', link.id)

    return Response.json(
      { data: { target: 'invite', house_id: room.house_id, room_id: link.room_id }, traceId },
    )
  }

  return Response.json({ _error: 'invalid_target', traceId }, { status: 500 })
}

export { handler as POST }