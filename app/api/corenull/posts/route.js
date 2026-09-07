﻿// CoreNull - Posts API
// Message type: post | comment | fruit
// GET  ?post_id=   → 단건 조회
// GET  ?room_id=   → 방 포스트 목록
// GET  ?parent_id= → 댓글 목록
// POST             → 작성 (type 파라미터로 구분)
// PATCH            → 상태 변경 (action: archive | rebirth | harvest | edit | delete)

export const dynamic = 'force-dynamic'

const COREHUB_URL = 'https://brainpool-corehub.vercel.app/api/corehub/facts'

const pushFact = async (fact) => {
  await fetch(COREHUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fact),
  }).catch(() => null) // fire-and-forget
}

// ── CoreRing 번역 연동 ──────────────────────────────────────────────
// 예전 코드는 { message_id }만 보내고 끝났는데, CoreRing의 실제
// /api/translate는 그런 파라미터를 모른다(동기식 text-in/translated-out
// API이고 message_id/messages 테이블 자체를 모름). 그래서 번역이
// 조용히 아무 일도 안 하고 있었다 — 이번에 진짜 계약으로 교체한다.
//
// source_lang이 'ko'가 아니면 CoreRing의 resolveDirection 기본 분기가
// 항상 targetLang='KO'라, vi/en/ja/zh 등 어떤 언어를 보내도 한국어로
// 번역돼서 돌아온다(DeepL이 source는 자동 감지).
//
// 이 호출 자체가 CoreRing의 tb_trans_logs에 한 줄씩 쌓인다 — CoreNull에
// 입력된 글/댓글이 CoreRing의 데이터 자산이 되는 지점이 바로 여기다.
// CoreRing 쪽 코드는 전혀 수정하지 않는다.
const CORERING_TRANSLATE_TIMEOUT_MS = 8000

const translateViaCoreRing = async ({ text, sourceLang, ownerKey }) => {
  if (sourceLang === 'ko') return { translated: null, logId: null }

  const coreringUrl = process.env.CORERING_API_URL
  if (!coreringUrl) return { translated: null, logId: null }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CORERING_TRANSLATE_TIMEOUT_MS)

  try {
    const res = await fetch(`${coreringUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source_lang: sourceLang, user_id: ownerKey }),
      signal: controller.signal,
    })
    if (!res.ok) return { translated: null, logId: null }
    const data = await res.json()
    return { translated: data.translated || null, logId: data.log_id || null }
  } catch {
    // 타임아웃/네트워크 실패 — 번역 없이 진행. 게시 자체는 막지 않는다.
    return { translated: null, logId: null }
  } finally {
    clearTimeout(timeout)
  }
}

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method === 'GET')   return handleGet(req, traceId)
  if (req.method === 'POST')  return handlePost(req, traceId)
  if (req.method === 'PATCH') return handlePatch(req, traceId)
  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handleGet = async (req, traceId) => {
  const { searchParams } = new URL(req.url)
  const room_id   = searchParams.get('room_id')
  const post_id   = searchParams.get('post_id')
  const parent_id = searchParams.get('parent_id')
  const owner_key = searchParams.get('owner_key')

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  if (post_id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', post_id)
      .single()
    if (error || !data) return Response.json({ _error: 'post_not_found', traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (parent_id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('type', ['comment', 'fruit'])
      .contains('relations', { parent_id })
      .order('created_at', { ascending: true })
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (!room_id) {
    return Response.json({ _error: 'room_id_or_post_id_or_parent_id_required', traceId }, { status: 500 })
  }

  if (owner_key) {
    await supabase
      .from('corenull_footprints')
      .insert({ owner_key, room_id })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', room_id)
    .in('type', ['post', 'fruit'])
    .not('meta', 'cs', '{"deleted":true}')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
  return Response.json({ data, traceId })
}

const handlePost = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { room_id, owner_key, content, meta, type, relations } = body

  if (!room_id || !owner_key || !content) {
    return Response.json({ _error: 'room_id_owner_key_content_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const messageType = type || 'post'
  const insertPayload = {
    room_id,
    owner_key,
    type: messageType,
    content,
    meta: meta || {},
    relations: relations || {},
  }

  // room/house 조회 — house_id/primary_language는 post든 comment든 똑같이
  // 필요하다(번역 대상 언어를 house 기준으로 판단하므로). 예전엔 이 조회
  // 자체가 댓글에서 통째로 스킵돼서 댓글엔 house_id도 안 붙어 있었다.
  //
  // 주의: 집주인/멤버 인증 체크는 기존 그대로 post류에만 적용한다(아래).
  // 댓글의 인증 체크 부재는 이번 변경의 범위가 아니다 — 별도로 짚어야 할
  // 사안이라 여기서 조용히 확장하지 않는다.
  const { data: room, error: roomError } = await supabase
    .from('corenull_rooms')
    .select('house_id')
    .eq('id', room_id)
    .single()
  if (roomError || !room) {
    return Response.json({ _error: 'room_not_found', traceId }, { status: 500 })
  }

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key, primary_language')
    .eq('id', room.house_id)
    .single()

  if (messageType !== 'comment') {
    const isOwner = house?.owner_key === owner_key
let isMember = false
if (!isOwner) {
  const { data: member } = await supabase
    .from('corenull_house_members')
    .select('device_id')
    .eq('house_id', room.house_id)
    .eq('room_id', room_id)        // ← 추가: 이 방에 초대된 참여자인지까지 확인
    .eq('device_id', owner_key)
    .single()
  isMember = !!member
}

    if (!isOwner && !isMember) {
      return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
    }
  }

  const sourceLang = house?.primary_language || 'ko'
  insertPayload.house_id = room.house_id
  insertPayload.language = sourceLang

  // CoreRing 번역 — post/comment 공통. insert 전에 동기 호출해서
  // 한 번의 insert로 끝낸다(응답을 오래 붙잡는 대신 insert→update
  // 왕복을 줄임). 실패해도 content 저장 자체는 항상 진행된다.
  const { translated, logId } = await translateViaCoreRing({
    text: content,
    sourceLang,
    ownerKey: owner_key,
  })
  insertPayload.translated_ko = translated
  insertPayload.translation_status =
    sourceLang === 'ko' ? 'completed' : (translated ? 'completed' : 'failed')
  if (logId) {
    insertPayload.meta = { ...insertPayload.meta, corering_log_id: logId }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(insertPayload)
    .select()
    .single()
  if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

  // CoreHub Fact Push — fruit 생성 시
  if (messageType === 'fruit') {
    await pushFact({
      source: 'CoreNull',
      fact_type: 'space.fruit.created',
      owner_key,
      house_id: insertPayload.house_id || null,
      payload: {
        post_id: data.id,
        room_id,
        parent_id: relations?.parent_id || null,
      },
    })
  }

  // 댓글 작성 시 원글 작성자에게 푸시
  const coreringUrl = process.env.CORERING_API_URL
  if (messageType === 'comment' && coreringUrl) {
    const parentId = relations?.parent_id
    if (parentId) {
      const { data: parentPost } = await supabase
        .from('messages')
        .select('owner_key, content')
        .eq('id', parentId)
        .single()
      if (parentPost?.owner_key && parentPost.owner_key !== owner_key) {
        fetch(`${coreringUrl}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parentPost.owner_key,
            title: '💬 새 댓글',
            body: content.slice(0, 50),
            url: `/posts/${parentId}`,
          }),
        }).catch(() => {})
      }
    }
  }

  return Response.json({ data, traceId })
}

const handlePatch = async (req, traceId) => {
  const body = JSON.parse(await req.text())
  const { post_id, owner_key, action, content, meta, room_id } = body

  if (!post_id || !owner_key || !action) {
    return Response.json({ _error: 'post_id_owner_key_action_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const { data: original, error: fetchError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', post_id)
    .single()
  if (fetchError || !original) {
    return Response.json({ _error: 'post_not_found', traceId }, { status: 500 })
  }

  if (original.owner_key !== owner_key) {
    return Response.json({ _error: 'not_authorized', traceId }, { status: 500 })
  }

  if (action === 'edit') {
    if (!content) {
      return Response.json({ _error: 'content_required', traceId }, { status: 500 })
    }
    const { data, error } = await supabase
      .from('messages')
      .update({
        content,
        meta: meta ? { ...(original.meta || {}), ...meta } : original.meta,
      })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (action === 'delete') {
    const { data, error } = await supabase
      .from('messages')
      .update({ meta: { ...(original.meta || {}), deleted: true } })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (action === 'archive') {
    const { data, error } = await supabase
      .from('messages')
      .update({ meta: { ...(original.meta || {}), archived: true } })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (action === 'rebirth') {
    const newContent = content || original.content
    const sourceLang = original.language || 'ko'
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: room_id || original.room_id,
        owner_key,
        type: 'post',
        content: newContent,
        meta: {
          ...(original.meta || {}),
          archived: false,
          reborn_from: post_id,
          reborn_at: new Date().toISOString(),
        },
        relations: {},
        language: sourceLang,
        translated_ko: null,
        translation_status: sourceLang === 'ko' ? 'completed' : 'pending',
      })
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })
    return Response.json({ data, traceId })
  }

  if (action === 'harvest') {
    if (original.type !== 'fruit') {
      return Response.json({ _error: 'only_fruit_can_be_harvested', traceId }, { status: 500 })
    }
    if (original.harvested_at) {
      return Response.json({ _error: 'already_harvested', traceId }, { status: 500 })
    }
    const { data, error } = await supabase
      .from('messages')
      .update({ harvested_at: new Date().toISOString() })
      .eq('id', post_id)
      .select()
      .single()
    if (error) return Response.json({ _error: error.message, traceId }, { status: 500 })

    await pushFact({
      source: 'CoreNull',
      fact_type: 'space.fruit.harvested',
      owner_key,
      house_id: original.house_id || null,
      payload: {
        post_id,
        room_id: original.room_id,
        harvested_at: data.harvested_at,
      },
    })

    return Response.json({ data, traceId })
  }

  return Response.json({ _error: 'invalid_action', traceId }, { status: 500 })
}

export { handler as GET, handler as POST, handler as PATCH }