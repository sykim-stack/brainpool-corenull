// lib/metadata.ts
// CoreNull SEO 공통 메타데이터 생성
// Section 15: public 데이터만 SEO 대상

import type { Metadata } from 'next'

const BASE_URL = 'https://corenull.vercel.app'

// ─── 공통 noindex ────────────────────────────────────────
export const noindexMetadata: Metadata = {
  robots: { index: false, follow: false },
}

// ─── House ───────────────────────────────────────────────
export async function getHouseMetadata(houseId: string): Promise<Metadata> {
  try {
    const res = await fetch(`${BASE_URL}/api/corenull/houses?house_id=${houseId}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const house = data.house
    if (!house) return noindexMetadata

    return {
      title: house.title,
      description: house.description || `${house.title} — CoreNull`,
      openGraph: {
        title: house.title,
        description: house.description || `${house.title} — CoreNull`,
        url: `${BASE_URL}/houses/${houseId}`,
        type: 'website',
      },
    }
  } catch {
    return noindexMetadata
  }
}

// ─── Room ────────────────────────────────────────────────
export async function getRoomMetadata(roomId: string): Promise<Metadata> {
  try {
    const res = await fetch(`${BASE_URL}/api/corenull/rooms?room_id=${roomId}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const room = data.room
    if (!room) return noindexMetadata

    // Section 15: public 아니면 noindex
    if (room.visibility !== 'public') return noindexMetadata

    return {
      title: room.room_name,
      description: `${room.room_name} — CoreNull`,
      openGraph: {
        title: room.room_name,
        description: `${room.room_name} — CoreNull`,
        url: `${BASE_URL}/rooms/${roomId}`,
        type: 'website',
      },
    }
  } catch {
    return noindexMetadata
  }
}

// ─── Post ────────────────────────────────────────────────
export async function getPostMetadata(postId: string): Promise<Metadata> {
  try {
    const res = await fetch(`${BASE_URL}/api/corenull/posts?post_id=${postId}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const post = data.data
    if (!post) return noindexMetadata

    // 방 visibility 확인
    const rRes = await fetch(`${BASE_URL}/api/corenull/rooms?room_id=${post.room_id}`, {
      next: { revalidate: 3600 },
    })
    const rData = await rRes.json()
    const room = rData.room

    // Section 15: public 방 아니면 noindex
    if (!room || room.visibility !== 'public') return noindexMetadata

    const preview = post.content?.slice(0, 100) || ''
    const firstImage = post.meta?.media?.find((m: any) => m.type === 'image')

    return {
      title: preview || 'CoreNull 이야기',
      description: preview,
      openGraph: {
        title: preview || 'CoreNull 이야기',
        description: preview,
        url: `${BASE_URL}/posts/${postId}`,
        type: 'article',
        ...(firstImage ? { images: [{ url: firstImage.url }] } : {}),
      },
    }
  } catch {
    return noindexMetadata
  }
}