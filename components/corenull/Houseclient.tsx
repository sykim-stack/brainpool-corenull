'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import ShareModal from '@/components/corenull/ShareModal'
import PostBlock from '@/components/corenull/PostBlock'

// ─────────────────────────────────────────────────────────────
// 마당 (House Yard) — "골목에서 바라본 House의 모습"
//
// 구조: Hero(집 배경) + 문패(이름/주소/소개/숙성도/통계) + CTA(이웃되기/초대)
//       → 콘텐츠 목록(PostBlock, 이 House의 공개 Room들 최신 글)
//       → 이웃 섹션(자리만, ADR-ACCESS-002 전까지 비활성)
//
// Room Card를 쓰지 않는다 — 마당의 기본 콘텐츠 단위는 Post다 (Room Card는
// 광장에서 "Room을 탐색"할 때만 쓰는 별개 컴포넌트).
// ─────────────────────────────────────────────────────────────

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

export default function HouseYard() {
  const { houseId } = useParams()
  const router = useRouter()

  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [stats, setStats] = useState({ publicRooms: 0, fruits: 0 })
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    if (!houseId) return
    load(key)
  }, [houseId])

  async function load(key: string) {
    setLoading(true)
    const hRes = await fetch(`/api/corenull/houses?house_id=${houseId}`).then((r) => r.json())
    const houseData = hRes.house || null
    setHouse(houseData)
    if (!houseData) {
      setLoading(false)
      return
    }

    // Room Card와 달리 마당은 "Room 목록"이 아니라 "그 Room들의 최신 글"이 필요하다.
    // rooms API는 이미 stage(스위치 모델)를 붙여서 주므로 재사용한다.
    const rRes = await fetch(`/api/corenull/rooms?house_id=${houseId}&owner_key=${key}`).then((r) => r.json())
    const rooms = (rRes.data || []).filter((r: any) => r.visibility === 'public')

    const isOwner = houseData.owner_key === key
    const relation = isOwner ? '나' : '공개' // 이웃 판별은 ADR-ACCESS-002 이후 (지금은 소유자 vs 그 외만 구분)

    // Room별 최근 글을 모아 하나의 콘텐츠 목록으로 합친다 (마당 = Post 목록).
    const postsByRoom = await Promise.all(
      rooms.map((room: any) =>
        fetch(`/api/corenull/posts?room_id=${room.id}&owner_key=${key}`)
          .then((r) => r.json())
          .then((d) => (d.data || []).slice(0, 5).map((p: any) => ({ ...p, _room: room })))
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
        comment_count: undefined, // 댓글 수는 상세에서만 표시 (목록에서는 생략)
        view_meta: {
          house_name: houseData.title,
          room_name: p._room.room_name,
          relation,
          stage_emoji: emojiForStage(p._room.stage),
        },
      }))

    setPosts(merged)
    setStats({
      publicRooms: rooms.length,
      fruits: rooms.filter((r: any) => r.stage?.harvested).length,
    })
    setLoading(false)
  }

  const isOwner = house?.owner_key === ownerKey

  const handleInvite = async () => {
    if (inviteLoading) return
    setInviteLoading(true)
    const res = await fetch('/api/corenull/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_id: houseId, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data?.invite_token) {
      setInviteUrl(`https://corenull.vercel.app/invite/${data.data.invite_token}`)
      setShowShare(true)
    }
    setInviteLoading(false)
  }

  if (loading) return <div style={styles.loading}>🏡</div>
  if (!house) return <div style={styles.loading}>집을 찾을 수 없어요</div>

  const langFlag = LANG_FLAG[house.primary_language] || '🌐'
  const since = new Date(house.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  return (
    <div>
      {/* ── Hero: 집 배경 (Message 미디어 재사용, 없으면 그라데이션) ── */}
      <div
        style={{
          ...styles.hero,
          ...(house.hero_image_url
            ? { backgroundImage: `url(${house.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(150deg, #DCD5BE, #C6BC9C)' }),
        }}
      >
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        {house.hero_image_url && <div style={styles.heroScrim} />}
      </div>

      {/* ── 문패: 나이테 + 이름/주소/소개, Hero 하단에 겹침 ── */}
      <div style={styles.doorplateWrap}>
        <Ring createdAt={house.created_at} activity={stats.publicRooms + stats.fruits} />
        <div style={styles.doorplate}>
          <div style={styles.houseName}>{house.title}</div>
          <div style={styles.address}>CoreNull · since {since}</div>
          {house.description && <div style={styles.description}>{house.description}</div>}
        </div>
      </div>

      <div style={styles.body}>
        {/* 통계 3개 — 계산은 표시만, 저장 안 함 */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{stats.publicRooms}</span>
            <span style={styles.statLabel}>공개방</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{stats.fruits}</span>
            <span style={styles.statLabel}>열매</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>—</span>
            <span style={styles.statLabel}>이웃</span>
          </div>
        </div>

        {/* CTA — 이웃되기(ADR-ACCESS-002 전까지 비활성), 초대하기(기존 기능 재사용) */}
        <div style={styles.ctaRow}>
          <button style={styles.ctaPrimaryDisabled} disabled>
            🤝 이웃 되기 · 곧
          </button>
          {isOwner && (
            <button style={styles.ctaGhost} onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? '...' : '🔗 초대하기'}
            </button>
          )}
        </div>

        {/* ── 콘텐츠 목록: PostBlock — 마당의 본체 ── */}
        <div style={styles.sectionTitle}>이야기</div>
        {posts.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
            <div style={styles.emptyText}>아직 남긴 이야기가 없어요</div>
          </div>
        ) : (
          <div style={styles.postList}>
            {posts.map((post) => (
              <PostBlock key={post.id} post={post} onClick={() => router.push(`/posts/${post.id}`)} />
            ))}
          </div>
        )}

        {/* ── 이웃 섹션: 자리만, ADR-ACCESS-002 전까지 빈 상태 ── */}
        <div style={{ ...styles.sectionTitle, marginTop: 24 }}>👥 이웃</div>
        <div style={styles.emptyCard}>
          <div style={styles.emptyText}>이웃 기능은 곧 열려요</div>
        </div>
      </div>

      {showShare && inviteUrl && (
        <ShareModal url={inviteUrl} title={`${house.title} 초대`} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}

// 나이테(Hero Ring) — House 정적 데이터로 지금 바로 계산해서 그린다 (CoreHub 없이도 동작).
// 링 색 진하기 = 활동량, 링 색 = 경과일. 사진이 없으므로 중심엔 이모지만 둔다.
function Ring({ createdAt, activity }: { createdAt: string; activity: number }) {
  const days = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000))
  const ageRing = days > 180 ? '#8C4B37' : days > 30 ? '#A6813F' : '#C7C0AC'
  const activityRing = activity > 5 ? '#5C6B4C' : activity > 0 ? '#8FA678' : '#DCD5BE'

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={styles.ring}>
      <circle cx="32" cy="32" r="30" fill="#FBF7EC" stroke="#F1ECDD" strokeWidth={1} />
      <circle cx="32" cy="32" r="26" stroke={ageRing} strokeWidth={2} fill="none" />
      <circle cx="32" cy="32" r="19" stroke={activityRing} strokeWidth={2.5} fill="none" />
      <text x="32" y="38" textAnchor="middle" fontSize="20">🏡</text>
    </svg>
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
  hero: {
    position: 'relative', height: 150, marginTop: -56, // layout.tsx의 paddingTop(56)을 밀어내고 화면 최상단부터 채움
    display: 'flex', alignItems: 'flex-start',
  },
  backBtn: {
    margin: 16, width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(20,22,16,0.4)', color: '#F1ECDD',
    border: 'none', fontSize: 16, cursor: 'pointer', zIndex: 2,
  },
  heroScrim: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(0deg, rgba(20,22,16,0.7) 0%, transparent 55%)',
  },
  doorplateWrap: {
    display: 'flex', alignItems: 'flex-end', gap: 12,
    padding: '0 16px', marginTop: -38,
  },
  ring: { flexShrink: 0, filter: 'drop-shadow(0 2px 6px rgba(44,24,16,0.2))' },
  doorplate: { paddingBottom: 4 },
  houseName: { fontFamily: "'Noto Serif KR', serif", fontSize: 19, fontWeight: 700, color: '#2C1810' },
  address: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#9A8470', marginTop: 2 },
  description: { fontSize: 12, color: '#5C4A35', fontStyle: 'italic', marginTop: 4, maxWidth: 260 },
  body: { padding: '16px' },
  statsRow: {
    display: 'flex', alignItems: 'center', background: '#FEFCF8',
    border: '1px solid rgba(92,61,46,0.12)', borderRadius: 14, padding: '14px', marginBottom: 12,
  },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  statNum: { fontSize: 18, fontWeight: 600, color: '#2C1810' },
  statLabel: { fontSize: 10.5, color: '#9A8470' },
  statDivider: { width: 1, height: 26, background: 'rgba(92,61,46,0.12)' },
  ctaRow: { display: 'flex', gap: 8, marginBottom: 24 },
  ctaPrimaryDisabled: {
    flex: 1, padding: '12px', borderRadius: 12, border: 'none',
    background: 'rgba(140,75,55,0.15)', color: '#8C4B37', fontSize: 13, fontWeight: 500,
    cursor: 'default', opacity: 0.7,
  },
  ctaGhost: {
    flex: 1, padding: '12px', borderRadius: 12,
    background: 'none', border: '1px solid rgba(92,61,46,0.2)', color: '#5C4A35',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: 11, color: '#9A8470', letterSpacing: '1px',
    textTransform: 'uppercase', marginBottom: 10,
  },
  postList: { display: 'flex', flexDirection: 'column', gap: 12 },
  emptyCard: {
    background: '#FEFCF8', borderRadius: 16,
    border: '1px dashed rgba(92,61,46,0.2)', padding: '28px 20px', textAlign: 'center',
  },
  emptyText: { fontSize: 13, color: '#9A8470' },
}