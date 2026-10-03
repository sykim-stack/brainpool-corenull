// CoreNull Interest helpers
// 관심 = Room → Library (글 클릭이어도 방을 저장)

export type BookmarkRow = {
  id: string
  message_id?: string | null
  room_id?: string | null
  ended_at: string | null
}

export type InterestState = 'none' | 'active' | 'ended'

/** 글에 붙은 관심 상태 — 방 북마크 우선, 레거시 message 북마크 허용 */
export function getPostInterestState(
  bookmarks: BookmarkRow[],
  postId: string,
  roomId?: string | null
): InterestState {
  if (roomId) {
    const roomBm = bookmarks.find((b) => b.room_id === roomId && !b.message_id)
    if (roomBm) return roomBm.ended_at ? 'ended' : 'active'
  }
  const msgBm = bookmarks.find((b) => b.message_id === postId)
  if (msgBm) return msgBm.ended_at ? 'ended' : 'active'
  return 'none'
}

/** 토글 대상 찾기 — 방 우선 */
export function findInterestBookmark(
  bookmarks: BookmarkRow[],
  postId: string,
  roomId?: string | null
): BookmarkRow | undefined {
  if (roomId) {
    const roomBm = bookmarks.find((b) => b.room_id === roomId && !b.message_id)
    if (roomBm) return roomBm
  }
  return bookmarks.find((b) => b.message_id === postId)
}

/** POST body — room_id 있으면 방만 저장 */
export function interestPostBody(
  ownerKey: string,
  postId: string,
  roomId?: string | null
): { owner_key: string; room_id?: string; message_id?: string } {
  if (roomId) return { owner_key: ownerKey, room_id: roomId }
  return { owner_key: ownerKey, message_id: postId }
}
