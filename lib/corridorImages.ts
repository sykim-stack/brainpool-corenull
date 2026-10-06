// lib/corridorImages.ts
// 거실 복도 블록 배경 — 광장/마당 골목(/alley/alley-0N)과 동일 패턴
// 방 순서 index % 5 → corridor-01..05, 6번째 방부터 다시 01

export const CORRIDOR_COVER_COUNT = 5

/** 방 목록 순번(0-based) → 공용 복도 커버 URL */
export function roomCorridorCoverUrl(roomIndex: number): string {
  const n =
    ((Math.floor(roomIndex) % CORRIDOR_COVER_COUNT) + CORRIDOR_COVER_COUNT) %
    CORRIDOR_COVER_COUNT
  return `/corridor/corridor-${String(n + 1).padStart(2, '0')}.jpg`
}
