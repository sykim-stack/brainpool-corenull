'use client'

import { computeStage } from '@/lib/roomStage'

// Room Card — 광장/마당/거실/서재 공통. Experience마다 새 카드 만들지 않음.
// 광장 클릭 → House 마당 (호출부 onClick). 카드는 그리기만 담당.

const VIS_LABEL: Record<string, string> = {
  public: '🌍 공개',
  invite: '👥 이웃공개',
  private: '🔒 비공개',
}

const DOT_COLORS = ['#8C4B37', '#5C6B4C', '#A6813F', '#6B5B95', '#3A6EA5']
function colorForId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return DOT_COLORS[hash % DOT_COLORS.length]
}

type RoomStage = {
  seed_started_at: string | null
  seed_target_date: string | null
  participants_preview: string[]
  harvested: boolean
}

type LatestMessage = {
  image_url: string | null
  text: string
  created_at: string
} | null

export interface RoomCardProps {
  room: {
    id: string
    room_name: string
    visibility: 'public' | 'invite' | 'private'
    stage: RoomStage
    latest_message?: LatestMessage
  }
  /** 광장 등 — 집 이름 표시 (마당 점프 맥락) */
  houseName?: string | null
  onClick?: () => void
}

function formatRelative(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 2) return '어제'
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return `${Math.floor(diff / (86400 * 7))}주 전`
}

export default function RoomCard({ room, houseName, onClick }: RoomCardProps) {
  const { stage } = room
  const { emoji, daysLeft } = computeStage(stage)
  const hasImage = !!room.latest_message?.image_url
  const visLabel = VIS_LABEL[room.visibility] || VIS_LABEL.public
  const participants = stage.participants_preview || []
  const showDday = !!stage.seed_target_date && daysLeft !== null && daysLeft >= 0

  return (
    <div
      style={{ ...styles.card, ...(hasImage ? {} : styles.cardNoImg) }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {hasImage && (
        <>
          <img src={room.latest_message!.image_url!} alt="" style={styles.img} />
          <div style={styles.scrim} />
        </>
      )}

      {emoji && (
        <div style={{ ...styles.stageIco, ...(hasImage ? {} : styles.stageIcoNoImg) }}>
          {emoji}
        </div>
      )}

      {showDday && (
        <div style={styles.ddate}>{daysLeft === 0 ? 'D-DAY' : `D-${daysLeft}`}</div>
      )}

      <div style={{ ...styles.body, ...(hasImage ? {} : styles.bodyNoImg) }}>
        <div>
          {houseName && (
            <div style={{ ...styles.hname, ...(hasImage ? {} : styles.hnameNoImg) }}>
              {houseName}
            </div>
          )}
          <div style={styles.rname}>{room.room_name}</div>
          <div style={{ ...styles.rcaption, ...(hasImage ? {} : styles.rcaptionNoImg) }}>
            {room.latest_message?.text || '아직 남긴 이야기가 없어요'}
          </div>
        </div>
        <div style={styles.rmeta}>
          <span style={{ ...styles.visBadge, ...(hasImage ? {} : styles.visBadgeNoImg) }}>
            {visLabel}
          </span>
          {room.latest_message && <span>{formatRelative(room.latest_message.created_at)}</span>}
          {participants.length > 0 && (
            <div style={styles.pstack}>
              {participants.map((id) => (
                <div
                  key={id}
                  style={{
                    ...styles.p,
                    background: colorForId(id),
                    borderColor: hasImage ? 'rgba(20,22,16,0.4)' : '#EDE7D8',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: 'relative',
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(44,24,16,0.08)',
  },
  cardNoImg: {
    background: 'linear-gradient(150deg, #DCD5BE, #C6BC9C)',
    alignItems: 'stretch',
  },
  img: {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  },
  scrim: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(0deg, rgba(20,22,16,0.85) 0%, transparent 62%)',
  },
  body: {
    position: 'relative', zIndex: 2, padding: '12px 13px', width: '100%',
    color: '#F1ECDD', boxSizing: 'border-box',
  },
  bodyNoImg: {
    color: '#232A20', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', height: '100%',
  },
  hname: {
    fontSize: 10.5,
    opacity: 0.85,
    marginBottom: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hnameNoImg: { opacity: 0.7 },
  rname: {
    fontFamily: "'Noto Serif KR', serif", fontWeight: 600, fontSize: 14.5,
  },
  rcaption: {
    fontSize: 11.5, opacity: 0.9, marginTop: 4,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rcaptionNoImg: { opacity: 0.75, whiteSpace: 'normal', lineHeight: 1.5 },
  rmeta: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 9.5, opacity: 0.85,
  },
  visBadge: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
    padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.16)',
  },
  visBadgeNoImg: { background: 'rgba(35,42,32,0.08)' },
  stageIco: {
    position: 'absolute', top: 10, right: 10, zIndex: 3,
    width: 24, height: 24, borderRadius: '50%',
    background: 'rgba(20,22,16,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
  },
  stageIcoNoImg: { background: 'rgba(35,42,32,0.1)' },
  pstack: { display: 'flex', marginLeft: 'auto' },
  p: {
    width: 16, height: 16, borderRadius: '50%', marginLeft: -6, borderWidth: 1.5, borderStyle: 'solid',
  },
  ddate: {
    position: 'absolute', top: 10, left: 10, zIndex: 3,
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
    background: 'rgba(20,22,16,0.5)', color: '#F1ECDD',
    padding: '3px 8px', borderRadius: 10,
  },
}
