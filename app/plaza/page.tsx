'use client'

// 광장 = 비이웃 발견·신청 + 공개방 둘러보기 (관계 관리는 마당)
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import TopBar from '@/components/blocks/TopBar'
import HeroBlock from '@/components/blocks/HeroBlock'
import MyContentBlock from '@/components/blocks/MyContentBlock'
import NeighborContentBlock, { NeighborChip, NeighborRoomSlot } from '@/components/blocks/NeighborContentBlock'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import { PostBlockData } from '@/components/blocks/PostBlock'
import { createYardSampleView } from '@/lib/livingSamples'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

function isYardVisibleRoom(rm: any) {
  return rm.visibility === 'public' || rm.visibility === 'invite'
}

function roomStatusLabel(rm: any): string {
  const parts: string[] = []
  if (rm.visibility === 'public') parts.push('공개')
  else if (rm.visibility === 'invite') parts.push('이웃공개')
  else if (rm.visibility === 'private') parts.push('비공개')
  if (rm.seed_mode || rm.room_type === 'seed') parts.push('씨드')
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '방'
}

async function loadHouseRoomSlots(h: any): Promise<NeighborRoomSlot[]> {
  try {
    const rd = await fetch(`/api/corenull/rooms?house_id=${h.id}`).then((r) => r.json())
    const list = (rd.data || []).filter(isYardVisibleRoom).slice(0, 6)
    return Promise.all(
      list.map(async (rm: any) => {
        const pd = await fetch(`/api/corenull/posts?room_id=${rm.id}`).then((r) => r.json())
        const latest = (pd.data || []).find((post: any) => post.type !== 'comment') || (pd.data || [])[0]
        return {
          roomId: rm.id,
          roomName: rm.room_name,
          latestPost: latest
            ? ({
                id: latest.id,
                content: latest.content,
                media: latest.meta?.media,
                created_at: latest.created_at,
                comment_count: latest.comment_count ?? 0,
                room_id: rm.id,
                view_meta: {
                  room_name: rm.room_name,
                  house_name: h.title,
                  status: roomStatusLabel(rm),
                  stage_emoji: rm.seed_mode || rm.room_type === 'seed' ? '🌱' : undefined,
                },
              } as PostBlockData)
            : null,
        }
      }),
    )
  } catch {
    return []
  }
}

export default function PlazaPage() {
  const router = useRouter()
  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recommended, setRecommended] = useState<NeighborChip[]>([])
  const [applyLoadingHouseId, setApplyLoadingHouseId] = useState<string | null>(null)
  const [publicRooms, setPublicRooms] = useState<any[]>([])

  const loadAll = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const [houseResult, plazaResult] = await Promise.all([
        key
          ? fetch(`/api/corenull/houses?owner_key=${encodeURIComponent(key)}`).then((r) => r.json())
          : Promise.resolve({ data: [] }),
        fetch('/api/corenull/rooms?scope=plaza&limit=60').then((r) => r.json()),
      ])
      const myHouse = houseResult.data?.[0] || null
      setHouse(myHouse)
      const sample = createYardSampleView(key || 'plaza-visitor')

      if (!myHouse) {
        setPublicRooms(plazaResult.data || [])
        setRecommended(sample.recommended)
        setLoading(false)
        return
      }

      const [nb, disc] = await Promise.all([
        fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`).then((r) => r.json()),
        fetch(`/api/corenull/houses?action=discover&house_id=${myHouse.id}`).then((r) => r.json()),
      ])
      const nbRows = nb.data || []
      const pendingTargetIds = new Set(
        nbRows.filter((n: any) => n.status === 'pending' && n.house).map((n: any) => n.house.id),
      )
      const acceptedHouseIds = new Set(
        nbRows.filter((n: any) => n.status === 'accepted' && n.house).map((n: any) => n.house.id),
      )
      const visibleRooms = [...(plazaResult.data || [])]
        .filter((rm: any) => rm.house_id && rm.house_id !== myHouse.id && !acceptedHouseIds.has(rm.house_id))
        .sort((a: any, b: any) => {
          const at = a.latest_message?.created_at ? new Date(a.latest_message.created_at).getTime() : 0
          const bt = b.latest_message?.created_at ? new Date(b.latest_message.created_at).getTime() : 0
          return bt - at
        })
      setPublicRooms(visibleRooms)

      const discHouses = (disc.data || []).slice(0, 8)
      const rec: NeighborChip[] = await Promise.all(
        discHouses.map(async (h: any, index: number) => ({
          neighborId: `plaza-${h.id}`,
          houseId: h.id,
          title: h.title,
          langFlag: LANG_FLAG[h.primary_language] || '🌐',
          avatarUrl: h.avatar_url || null,
          coverUrl: `/alley/alley-${String((index % 5) + 1).padStart(2, '0')}.jpg`,
          rooms: await loadHouseRoomSlots(h),
          requestPending: pendingTargetIds.has(h.id),
        })),
      )
      setRecommended(rec.length > 0 ? rec : sample.recommended)
    } catch {
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const key = getOwnerKey() || ''
    setOwnerKey(key)
    loadAll(key)
  }, [loadAll])

  const handleApplyNeighbor = async (targetHouseId: string) => {
    if (!house || !ownerKey || applyLoadingHouseId) return
    setApplyLoadingHouseId(targetHouseId)
    try {
      const res = await fetch('/api/corenull/houses?action=neighbor-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house_a_id: house.id, owner_key: ownerKey, house_b_id: targetHouseId }),
      })
      const data = await res.json()
      if (data.data) {
        setRecommended((prev) => prev.map((item) =>
          item.houseId === targetHouseId ? { ...item, requestPending: true } : item,
        ))
        await loadAll(ownerKey)
      }
    } finally {
      setApplyLoadingHouseId(null)
    }
  }

  const sample = createYardSampleView(ownerKey || 'plaza-visitor')
  const publicPosts: PostBlockData[] = publicRooms.map((rm: any) => ({
    id: `plaza-room-${rm.id}`,
    content: rm.latest_message?.text || `${rm.room_name || '공개방'}을 둘러보세요.`,
    media: rm.latest_message?.image_url
      ? [{ type: 'image', url: rm.latest_message.image_url }]
      : undefined,
    created_at: rm.latest_message?.created_at || rm.created_at,
    comment_count: 0,
    room_id: rm.id,
    view_meta: {
      house_name: rm.corenull_houses?.title,
      room_name: rm.room_name,
      status: roomStatusLabel(rm),
    },
  }))
  const samplePosts = sample.myPosts.map((post) => ({ ...post, room_id: undefined }))
  const hasPublicImages = publicPosts.some((post) => (post.media?.length || 0) > 0)
  // 공개 글에 사진이 없으면 텍스트 공개 글은 유지하고 마당의 이미지 샘플을 함께 보여준다.
  const displayPosts = hasPublicImages ? publicPosts : [...samplePosts, ...publicPosts]
  const displayNeighbors = recommended.length > 0 ? recommended : sample.recommended

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="광장" />
      {loading ? (
        <div style={styles.loading}>🏛️</div>
      ) : (
        <>
          <HeroBlock
            background={{
              imageUrl: '/alley/alley-05.jpeg',
              gradient: 'linear-gradient(135deg, #6D5A47 0%, #A7835E 52%, #D8C4A8 100%)',
            }}
            ring={{ rings: [
              { index: 0, weight: 0.55 },
              { index: 1, weight: 0.38 },
              { index: 2, weight: 0.22 },
            ] }}
            avatar={<span style={{ fontSize: 42 }}>🏛️</span>}
            doorplate={{ title: '광장', description: '열려 있는 방과 이웃의 이야기를 둘러보세요' }}
            heroControls={displayNeighbors.length > 0 ? (
              <button
                type="button"
                title="무작위로 둘러보기"
                aria-label="무작위로 둘러보기"
                onClick={() => {
                  const target = displayNeighbors[Math.floor(Math.random() * displayNeighbors.length)]
                  if (target.houseId?.startsWith('yard-sample-house-')) router.push('/living')
                  else if (target.houseId) router.push(`/houses/${target.houseId}/yard`)
                }}
                style={styles.randomDoor}
              >🚪</button>
            ) : undefined}
          />
          <NeighborContentBlock
            tier="public"
            mode="recommend"
            neighbors={displayNeighbors}
            showNeighborSelector
            onNeighborClick={(houseId) => houseId.startsWith('yard-sample-house-')
              ? router.push('/living')
              : router.push(`/houses/${houseId}/yard`)}
            onPostClick={(postId, roomId) => {
              if (roomId) router.push(`/rooms/${roomId}`)
              else router.push(`/posts/${postId}`)
            }}
            onApplyNeighbor={house ? handleApplyNeighbor : undefined}
            applyLoadingHouseId={applyLoadingHouseId}
          />
          <MyContentBlock
            title="비이웃 공개방 최신"
            layout="brick"
            posts={displayPosts}
            onPostClick={(postId, roomId) => {
              if (roomId) router.push(`/rooms/${roomId}`)
              else if (postId.startsWith('sample-') || postId.startsWith('yard-sample-')) router.push('/living')
              else router.push(`/posts/${postId}`)
            }}
            emptyLabel="아직 둘러볼 공개방이 없어요"
          />
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  randomDoor: {
    width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(254,252,248,0.65)',
    background: 'rgba(28,18,8,0.42)', color: '#FEFCF8', fontSize: 18, cursor: 'pointer',
    backdropFilter: 'blur(6px)',
  },
}
