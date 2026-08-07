'use client'

import { computeStage } from '@/lib/roomStage'

// ─────────────────────────────────────────────────────────────
// Room Card — 광장/마당/거실/서재가 전부 재사용하는 유일한 카드.
// "One Room Card, Multiple Experiences" — 신규 컴포넌트를 Experience마다
// 따로 만들지 않는다 (ROADMAP Rule C).
//
// Experience별 사용 위치 (Grok 리뷰 2026-08-02 제안 반영)
//
// | Experience | 카드 클릭 결과   | 표시 목적            |
// |------------|-----------------|----------------------|
// | 광장       | House의 마당    | 새로운 사람 발견      |
// | 마당       | Room            | 집주인의 공간 탐색    |
// | 거실       | Room            | 내 공간 관리          |
// | 서재       | Room            | 완료된 기록 회고      |
//
// 광장에서만 "Room이 아니라 House"로 점프한다 — 사람을 먼저 만나고, 그다음
// 그 사람의 공간을 둘러보는 CoreNull 철학. 이 라우팅 판단은 이 컴포넌트가
// 하지 않는다. Room Card는 그리기만 하고, 어디로 갈지는 호출부(각 페이지)가
// onClick으로 넘겨준다.
//
// props로 받는 room은 lib/roomStage.js의 attachRoomStages/attachLatestMessages를
// 거쳐 room.stage(RoomStage)와 room.latest_message가 이미 붙어있다고 가정한다.
// ─────────────────────────────────────────────────────────────

const VIS_LABEL: Record<string, string> = {
  public: '🌍 공개',
  invite: '🤝 이웃',
  family: '🔒 비공개',
}

// participants_preview의 device_id를 결정적으로 색상에 매핑한다.
// 실제 프로필 사진이 없는 앱이라(아바타 이미지 자체가 없음), 같은 사람은
// 항상 같은 색 점으로 보이도록 문자열 해시만 쓴다.
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
    visibility: 'public' | 'invite' | 'family'
    stage: RoomStage
    latest_message?: LatestMessage
  }
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

export default function RoomCard({ room, onClick }: RoomCardProps) {
  const { stage } = room
  const { emoji, daysLeft } = computeStage(stage)
  const hasImage = !!room.latest_message?.image_url
  const visLabel = VIS_LABEL[room.visibility] || VIS_LABEL.public
  const participants = stage.participants_preview || []

  // D-day: 목표형이고 fruit 단계가 아닐 때만 (fruit이면 daysLeft가 항상 null로 옴)
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