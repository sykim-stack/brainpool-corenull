'use client'

// 발자취 = "어디를 다녀왔는가"
// House가 기억의 기준점. 방 단위 나열은 같은 집을 반복해 읽기 어려웠다.
// 집 한 줄 + 탭하면 방문한 방 펼침.

import { useState } from 'react'

export interface FootprintRoomVisit {
  id: string
  room_id: string
  room_name: string | null
  visited_at: string
}

export interface FootprintHouseGroupData {
  house_id: string | null
  house_name: string | null
  last_visited_at: string
  rooms: FootprintRoomVisit[]
}

export interface FootprintHouseGroupProps {
  group: FootprintHouseGroupData
  onRoomClick?: (roomId: string) => void
  onHouseClick?: (houseId: string | null) => void
}

function formatVisitedAt(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function FootprintHouseGroup({
  group,
  onRoomClick,
  onHouseClick,
}: FootprintHouseGroupProps) {
  const [open, setOpen] = useState(false)
  const roomCount = group.rooms.length

  return (
    <div style={styles.card}>
      <button
        type="button"
        style={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div style={styles.icon}>🏡</div>
        <div style={styles.info}>
          <div style={styles.houseName}>{group.house_name || '알 수 없는 집'}</div>
          <div style={styles.sub}>
            최근 {formatVisitedAt(group.last_visited_at)}
            {' · '}
            방 {roomCount}
          </div>
        </div>
        <span style={{ ...styles.chevron, transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>

      {open && (
        <div style={styles.roomList}>
          {group.rooms.map((rm) => (
            <button
              key={rm.id}
              type="button"
              style={styles.roomRow}
              onClick={() => onRoomClick?.(rm.room_id)}
            >
              <span style={styles.roomDot} />
              <span style={styles.roomName}>{rm.room_name || '방'}</span>
              <span style={styles.roomTime}>{formatVisitedAt(rm.visited_at)}</span>
            </button>
          ))}
          {group.house_id && onHouseClick && (
            <button
              type="button"
              style={styles.houseLink}
              onClick={() => onHouseClick(group.house_id)}
            >
              이 집 거실 보기 ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** room-level footprints → house groups (최근 방문 순) */
export function groupFootprintsByHouse(
  footprints: Array<{
    id: string
    room_id: string
    visited_at: string
    corenull_rooms?: {
      room_name?: string | null
      house_id?: string | null
      corenull_houses?: { id?: string; title?: string | null } | null
    } | null
  }>
): FootprintHouseGroupData[] {
  const map = new Map<string, FootprintHouseGroupData>()

  for (const fp of footprints) {
    const houseId =
      fp.corenull_rooms?.house_id ||
      fp.corenull_rooms?.corenull_houses?.id ||
      null
    const houseName = fp.corenull_rooms?.corenull_houses?.title || null
    const key = houseId || `name:${houseName || 'unknown'}`

    const room: FootprintRoomVisit = {
      id: fp.id,
      room_id: fp.room_id,
      room_name: fp.corenull_rooms?.room_name || null,
      visited_at: fp.visited_at,
    }

    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        house_id: houseId,
        house_name: houseName,
        last_visited_at: fp.visited_at,
        rooms: [room],
      })
    } else {
      existing.rooms.push(room)
      if (new Date(fp.visited_at) > new Date(existing.last_visited_at)) {
        existing.last_visited_at = fp.visited_at
      }
    }
  }

  const groups = Array.from(map.values())
  for (const g of groups) {
    g.rooms.sort(
      (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
    )
  }
  groups.sort(
    (a, b) =>
      new Date(b.last_visited_at).getTime() - new Date(a.last_visited_at).getTime()
  )
  return groups
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#FEFCF8',
    borderRadius: 14,
    border: '1px solid rgba(92,61,46,0.12)',
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(74,82,64,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  houseName: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#1C1208',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sub: {
    fontSize: 11,
    color: '#9A8470',
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: '#9A8470',
    flexShrink: 0,
    transition: 'transform 160ms ease',
  },
  roomList: {
    borderTop: '1px solid rgba(92,61,46,0.08)',
    padding: '6px 10px 10px 52px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  roomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 6px',
    border: 'none',
    background: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
  },
  roomDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'rgba(92,61,46,0.25)',
    flexShrink: 0,
  },
  roomName: {
    flex: 1,
    fontSize: 13,
    color: '#2C1810',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  roomTime: {
    fontSize: 11,
    color: '#9A8470',
    flexShrink: 0,
  },
  houseLink: {
    marginTop: 4,
    border: 'none',
    background: 'none',
    color: '#C17F3C',
    fontSize: 12,
    cursor: 'pointer',
    padding: '6px 6px',
    textAlign: 'left',
  },
}
