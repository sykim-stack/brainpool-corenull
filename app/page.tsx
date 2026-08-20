'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import ShareModal from '@/components/corenull/ShareModal'
import PostBlock from '@/components/corenull/PostBlock'

// ─────────────────────────────────────────────────────────────
// 거실 (Living) — "House 안으로 들어온 곳", 나만의 흐름.
//
// 마당과 같은 Hero Master를 쓰되 레이어를 덜 켠다 (큰 배경 이미지 없이
// 문패+Ring만). 콘텐츠는 마당과 동일하게 PostBlock — 다만 마당은
// public 방만 보여주고, 거실은 내 공간이라 비공개 방까지 전부 보여준다.
// 방 배열(관리) 섹션은 거실에만 있다 — 마당은 "밖에서 보는" 곳이라
// 방 만들기 같은 관리 기능이 없다.
// ─────────────────────────────────────────────────────────────

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

const COREHUB_URL = 'https://brainpool-corehub.vercel.app/api/corehub/opportunities'
const ACTION_LABEL: Record<string, string> = {
  'trigger.hajunai.nudge':     '🌱 씨앗이 기다리고 있어요',
  'trigger.hajunai.celebrate': '🍎 씨앗이 열매가 됐어요',
  'suggest.corering':          '💬 번역 도움이 필요하신가요?',
}

export default function LivingPage() {
  const router = useRouter()
  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [footprints, setFootprints] = useState<any[]>([])
  const [discoveries, setDiscoveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showShare, setShowShare] = useState(false)
  const [shareMode, setShareMode] = useState<'house' | 'invite'>('house')
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    const key = getDeviceId()
    if (!key) return
    setOwnerKey(key)

    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then((r) => r.json())
      .then(async (d) => {
        const myHouse = (d.data || [])[0] || null
        setHouse(myHouse)
        if (!myHouse) {
          setLoading(false)
          return
        }

        const [rRes, fRes] = await Promise.all([
          fetch(`/api/corenull/rooms?house_id=${myHouse.id}&owner_key=${key}`).then((r) => r.json()),
          fetch(`/api/corenull/footprints?owner_key=${key}`).then((r) => r.json()),
        ])
        const myRooms = rRes.data || []
        setRooms(myRooms)
        setFootprints(fRes.data || [])

        // 거실 콘텐츠 = 내 방(공개/비공개 전부) 최신 글. PostBlock으로 통일.
        const postsByRoom = await Promise.all(
          myRooms.map((room: any) =>
            fetch(`/api/corenull/posts?room_id=${room.id}&owner_key=${key}`)
              .then((r) => r.json())
              .then((pd) => (pd.data || []).slice(0, 8).map((p: any) => ({ ...p, _room: room })))
          )
        )
        const merged = postsByRoom
          .flat()
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((p: any) => ({
            id: p.id,
            content: p.content,
            media: p.meta?.media || [],
            created_at: p.created_at,
            view_meta: {
              room_name: p._room.room_name,
              relation: '나',
              stage_emoji: emojiForStage(p._room.stage),
            },
          }))
        setPosts(merged)

        fetch(`${COREHUB_URL}?owner_key=${key}`)
          .then((r) => r.json())
          .then((dd) => setDiscoveries((Array.isArray(dd.data) ? dd.data : []).slice(0, 3)))
          .catch(() => null)

        setLoading(false)
      })
  }, [])

  const handleDiscoveryDismiss = async (opportunityId: string) => {
    setDiscoveries((prev) => prev.filter((d) => d.id !== opportunityId))
    fetch(COREHUB_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opportunityId, outcome: 'shown' }),
    }).catch(() => null)
  }

  const handleShareHouse = () => {
    setShareMode('house')
    setInviteUrl(`https://corenull.vercel.app/houses/${house.id}`)
    setShowShare(true)
  }

  const handleInvite = async () => {
    if (inviteLoading || !house) return
    setInviteLoading(true)
    const res = await fetch('/api/corenull/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_id: house.id, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data?.invite_token) {
      setShareMode('invite')
      setInviteUrl(`https://corenull.vercel.app/invite/${data.data.invite_token}`)
      setShowShare(true)
    }
    setInviteLoading(false)
  }

  if (loading) return <div style={styles.loading}>🏠</div>

  if (!house) {
    return (
      <div>
        <div style={styles.header}>
          <span style={styles.logo}>Core<span style={{ color: '#C17F3C' }}>Null</span></span>
        </div>
        <div style={styles.body}>
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏡</div>
            <div style={styles.emptyText}>아직 집이 없어요</div>
            <button style={styles.createBtn} onClick={() => router.push('/houses/create')}>
              집 만들기
            </button>
          </div>
        </div>
      </div>
    )
  }

  const langFlag = LANG_FLAG[house.primary_language] || '🌐'

  return (
    <div>
      {/* 헤더 — 큰 Hero 이미지 없이 로고+공유만 (거실은 레이어를 덜 켠다) */}
      <div style={styles.header}>
        <span style={styles.logo}>Core<span style={{ color: '#C17F3C' }}>Null</span></span>
        <button style={styles.iconBtn} onClick={handleShareHouse}>🔗</button>
      </div>

      {/* 가벼운 문패 — Ring + 이름 + 컨텍스트 텍스트("나의 생활 공간") */}
      <div style={styles.doorplateWrap}>
        <div style={styles.ringSmall}>🏠</div>
        <div>
          <div style={styles.houseName}>{house.title}</div>
          <div style={styles.context}>{langFlag} 나의 생활 공간</div>
        </div>
      </div>

      <div style={styles.body}>
        {discoveries.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={styles.sectionTitle}>💡 오늘의 발견</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {discoveries.map((d: any) => {
                const label = ACTION_LABEL[d.action_type] || d.payload?.message || '새로운 연결을 발견했어요'
                return (
                  <div key={d.id} style={styles.discoveryCard}>
                    <span style={styles.discoveryText}>{label}</span>
                    <button style={styles.discoveryDismiss} onClick={() => handleDiscoveryDismiss(d.id)}>✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 방 배열 — 거실에만 있는 관리 기능 (마당엔 없음) */}
        <div style={styles.sectionTitle}>방</div>
        <div style={styles.roomChipRow}>
          {rooms.map((room: any) => (
            <button key={room.id} style={styles.roomChip} onClick={() => router.push(`/rooms/${room.id}`)}>
              {room.seed_mode ? '🌱 ' : ''}{room.room_name}
            </button>
          ))}
          <button style={styles.roomChipAdd} onClick={() => router.push('/write')}>+ 방 만들기</button>
        </div>

        {/* 콘텐츠 목록 — PostBlock, 마당과 동일 단위 재사용 */}
        <div style={{ ...styles.sectionTitle, marginTop: 20 }}>내 이야기</div>
        {posts.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <div style={styles.emptyText}>아직 남긴 이야기가 없어요</div>
          </div>
        ) : (
          <div style={styles.postList}>
            {posts.map((post) => (
              <PostBlock key={post.id} post={post} onClick={() => router.push(`/posts/${post.id}`)} />
            ))}
          </div>
        )}

        <button style={styles.inviteBtn} onClick={handleInvite} disabled={inviteLoading}>
          {inviteLoading ? '초대 링크 생성 중...' : '🔗 이웃 초대하기'}
        </button>

        {footprints.length > 0 && (
          <>
            <div style={{ ...styles.sectionTitle, marginTop: 24 }}>최근 방문</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {footprints.slice(0, 5).map((fp: any) => (
                <div key={fp.id} style={styles.visitItem} onClick={() => router.push(`/rooms/${fp.room_id}`)}>
                  <div style={styles.visitIcon}>👣</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.visitRoom}>{fp.corenull_rooms?.room_name || '방'}</div>
                    <div style={styles.visitTime}>{new Date(fp.visited_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <span style={{ fontSize: 16, color: '#9A8470' }}>›</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showShare && (
        <ShareModal
          url={inviteUrl}
          title={shareMode === 'invite' ? `${house.title} 초대` : house.title}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}

function emojiForStage(stage: any): string | null {
  if (!stage) return null
  if (stage.harvested) return '🍎'
  if (!stage.seed_started_at) return null
  if (!stage.seed_target_date) return '🌿'
  const start = new Date(stage.seed_started_at).getTime()
  const target = new Date(stage.seed_target_date).getTime()
  const ratio = target > start ? (Date.now() - start) / (target - start) : 1
  if (ratio <= 0) return '🌱'
  if (ratio < 0.8) return '🌿'
  if (ratio < 1) return '🌸'
  return '🍎'
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  logo: { fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810' },
  iconBtn: { width: 36, height: 36, borderRadius: '50%', background: '#F5F0E8', border: 'none', fontSize: 16, cursor: 'pointer' },
  doorplateWrap: {
    marginTop: 56, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
  },
  ringSmall: {
    width: 44, height: 44, borderRadius: '50%', background: '#F5F0E8',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
    border: '2px solid rgba(92,61,46,0.12)',
  },
  houseName: { fontFamily: "'Noto Serif KR', serif", fontSize: 17, fontWeight: 600, color: '#2C1810' },
  context: { fontSize: 12, color: '#9A8470', marginTop: 2 },
  body: { padding: '0 16px 16px' },
  sectionTitle: {
    fontSize: 11, color: '#9A8470', letterSpacing: '1px',
    textTransform: 'uppercase', marginBottom: 10,
  },
  discoveryCard: {
    background: 'linear-gradient(135deg, rgba(193,127,60,0.08), rgba(74,82,64,0.06))',
    border: '1px solid rgba(193,127,60,0.2)', borderRadius: 12, padding: '12px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  discoveryText: { fontSize: 13, color: '#2C1810', lineHeight: 1.5, flex: 1 },
  discoveryDismiss: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9A8470', padding: '0 0 0 8px', flexShrink: 0 },
  roomChipRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  roomChip: {
    fontSize: 12.5, padding: '8px 14px', borderRadius: 20,
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.15)', color: '#5C4A35', cursor: 'pointer',
  },
  roomChipAdd: {
    fontSize: 12.5, padding: '8px 14px', borderRadius: 20,
    background: 'none', border: '1px dashed rgba(92,61,46,0.25)', color: '#9A8470', cursor: 'pointer',
  },
  emptyCard: {
    background: '#FEFCF8', borderRadius: 16, border: '1px dashed rgba(92,61,46,0.2)',
    padding: '28px 20px', textAlign: 'center', marginBottom: 12,
  },
  emptyText: { fontSize: 13, color: '#9A8470' },
  createBtn: { padding: '10px 24px', background: '#2C1810', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', marginTop: 12 },
  postList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 },
  inviteBtn: {
    width: '100%', padding: '14px', background: 'rgba(74,82,64,0.08)',
    border: '1px solid rgba(74,82,64,0.2)', borderRadius: 14, fontSize: 14,
    color: '#4A5240', fontWeight: 500, cursor: 'pointer',
  },
  visitItem: {
    background: '#FEFCF8', borderRadius: 12, border: '1px solid rgba(92,61,46,0.12)',
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 8,
  },
  visitIcon: {
    width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #7A8C6E, #C8D5B9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  visitRoom: { fontSize: 13, color: '#1C1208', fontWeight: 500 },
  visitTime: { fontSize: 11, color: '#9A8470', marginTop: 2 },
}