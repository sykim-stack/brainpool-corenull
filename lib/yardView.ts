import { NeighborRoomSlot } from '@/components/blocks/NeighborContentBlock'

/**
 * 집의 공개/이웃공개 방 + 최신 글 단일 쿼리로 조회 (클라이언트용)
 * Server Component에서는 buildAlleyNeighborsOptimized 내부의 loadHouseRoomSlotsOptimized 사용
 */
export async function loadHouseRoomSlots(houseId: string): Promise<NeighborRoomSlot[]> {
  try {
    const rd = await fetch(`/api/corenull/rooms?house_id=${houseId}`).then((r) => r.json())
    const all = rd.data || []
    const visible = all.filter((r: any) => r.visibility === 'public' || r.visibility === 'invite').slice(0, 6)
    return Promise.all(
      visible.map(async (rm: any) => {
        try {
          const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
          const latest = (pd.data || []).find((x: any) => x.type !== 'comment') || (pd.data || [])[0]
          return {
            roomId: rm.id,
            roomName: rm.room_name,
            statusLabel: getRoomStatusLabel(rm),
            latestPost: latest
              ? {
                  id: latest.id,
                  content: latest.content,
                  media: latest.meta?.media,
                  created_at: latest.created_at,
                  comment_count: latest.comment_count ?? 0,
                }
              : null,
          } as NeighborRoomSlot
        } catch {
          return { roomId: rm.id, roomName: rm.room_name, statusLabel: getRoomStatusLabel(rm), latestPost: null }
        }
      })
    )
  } catch {
    return []
  }
}

function getRoomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}