// lib/accessPolicy.js
// ADR-ACCESS-001 — CoreNull Access Policy Engine
//
// 이 파일은 CoreNull의 유일한 권한 엔진이다.
// 다른 파일(route.js, 컴포넌트 등)에서 아래와 같은 코드를 직접 작성하지 않는다.
//
//   ❌ if (room.visibility === 'public') { ... }
//   ❌ if (room.visibility === 'invite') { ... }
//   ❌ if (owner_key === house.owner_key) { ... }  ← 접근 판단 목적일 때
//
// 대신 반드시 아래 함수만 호출한다.
//
//   canReadRoom(supabase, room, requesterOwnerKey)
//   canReadPost(supabase, post, requesterOwnerKey)
//   canJoinRoom(...)  ← 아직 미구현, Phase 2/ADR-ACCESS-002 대상
//
// 정책이 나중에 Neighbor → Participation → Membership → Paid Membership → Family
// 처럼 늘어나도, 호출부는 그대로 두고 이 파일(정책 엔진) 내부만 바꾸면 전체가 함께 바뀐다.
//
// Access Flow: Request → Visibility 확인 → Access 허용여부 → Permission → Query

// ─────────────────────────────────────────────────────────────
// 내부 순수 함수 — DB 호출 없음, 입력→출력만 판단한다.
// 테스트 프레임워크 도입 시 이 함수에 바로 유닛 테스트를 붙인다 (ADR-ACCESS-001 테스트 정책).
// 이 파일 밖에서 직접 호출하지 않는다 — 항상 canReadRoom/canReadPost를 거친다.
// ─────────────────────────────────────────────────────────────
function resolveAccessPolicy({ visibility, isOwner, isParticipant }) {
  // public — 누구나 허용
  if (visibility === 'public') {
    return { allowed: true }
  }

  // family(비공개) — House Owner 또는 그 Room의 Participant만 허용
  if (visibility === 'family') {
    if (isOwner || isParticipant) return { allowed: true }
    return { allowed: false, _error: 'ACCESS_DENIED' }
  }

  // invite(이웃) — Phase 2(Neighbor Relationship) 대상. 지금은 기존 동작 유지(통과).
  return { allowed: true }
}

// ─────────────────────────────────────────────────────────────
// 공개 API — 이 세 함수만 외부에서 호출한다.
// ─────────────────────────────────────────────────────────────

/**
 * Room을 읽을 수 있는지 판단한다.
 * room: { id, house_id, visibility } — corenull_rooms select 결과 일부면 충분하다.
 */
export async function canReadRoom(supabase, room, requesterOwnerKey) {
  if (!room) return { allowed: false, _error: 'ROOM_NOT_FOUND' }

  if (room.visibility === 'public') {
    return resolveAccessPolicy({ visibility: 'public', isOwner: false, isParticipant: false })
  }

  const { data: house } = await supabase
    .from('corenull_houses')
    .select('owner_key')
    .eq('id', room.house_id)
    .single()

  const isOwner = !!requesterOwnerKey && house?.owner_key === requesterOwnerKey

  let isParticipant = false
  if (!isOwner && room.visibility === 'family' && requesterOwnerKey) {
    const { data: member } = await supabase
      .from('corenull_house_members')
      .select('device_id')
      .eq('house_id', room.house_id)
      .eq('room_id', room.id)
      .eq('device_id', requesterOwnerKey)
      .maybeSingle()
    isParticipant = !!member
  }

  return resolveAccessPolicy({ visibility: room.visibility, isOwner, isParticipant })
}

/**
 * Post(Message)를 읽을 수 있는지 판단한다.
 * post: { room_id, ... } — messages select 결과 일부면 충분하다.
 * 내부적으로 post가 속한 room을 조회해 canReadRoom()으로 위임한다 —
 * "post_id만 알면 room visibility와 무관하게 읽히던" 우회 경로를 여기서 막는다.
 */
export async function canReadPost(supabase, post, requesterOwnerKey) {
  if (!post) return { allowed: false, _error: 'POST_NOT_FOUND' }
  if (!post.room_id) return { allowed: true } // room에 속하지 않은 message는 정책 대상 아님

  const { data: room } = await supabase
    .from('corenull_rooms')
    .select('id, house_id, visibility')
    .eq('id', post.room_id)
    .single()

  return canReadRoom(supabase, room, requesterOwnerKey)
}

/**
 * Room에 참여(Member/Participant 등록)할 수 있는지 판단한다.
 * 아직 정의되지 않았다 — Write/Manage 정책은 ADR-ACCESS-001 범위 밖이며,
 * 후속 ADR-ACCESS-002에서 다룬다. 호출하는 코드가 생겼다면 그 자체가
 * 스코프 밖 구현이 진행 중이라는 신호이므로 여기서 명시적으로 막아둔다.
 */
export async function canJoinRoom() {
  throw new Error(
    'canJoinRoom() is not implemented yet. Write/Manage policy is defined in a ' +
    'follow-up ADR-ACCESS-002, not ADR-ACCESS-001. Do not implement ad-hoc join logic ' +
    'elsewhere — wait for ADR-ACCESS-002 and implement it here.'
  )
}