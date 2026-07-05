import type { Metadata } from 'next'
import { getSupabase } from '@/lib/supabase'

const BASE_URL = 'https://corenull.vercel.app'

export const noindexMetadata: Metadata = {
  robots: { index: false, follow: false },
}

export async function getRoomMetadata(roomId: string): Promise<Metadata> {
  try {
    const supabase = getSupabase()
    if (!supabase) return noindexMetadata
    const { data } = await supabase
      .from('corenull_rooms')
      .select('room_name, visibility')
      .eq('id', roomId)
      .single()
    const room = data as { room_name: string | null; visibility: string } | null
    if (!room || room.visibility !== 'public') return noindexMetadata
    return {
      title: room.room_name ?? 'CoreNull',
      description: `${room.room_name} — CoreNull`,
      openGraph: {
        title: room.room_name ?? 'CoreNull',
        description: `${room.room_name} — CoreNull`,
        url: `${BASE_URL}/rooms/${roomId}`,
        type: 'website',
      },
    }
  } catch {
    return noindexMetadata
  }
}

export async function getPostMetadata(postId: string): Promise<Metadata> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  
  // 임시 디버그
  if (!url || !key) {
    return { title: 'ENV 없음', description: `url:${!!url} key:${!!key}` }
  }
  return { title: 'ENV 있음', description: postId }
}
  try {
    const supabase = getSupabase()
    if (!supabase) return noindexMetadata
    const sc = supabase
    const { data: postData } = await sc
      .from('messages')
      .select('content, room_id, meta')
      .eq('id', postId)
      .single()
    const post = postData as {
      content: string
      room_id: string | null
      meta: { media?: { type: string; url: string }[] }
    } | null
    if (!post) return noindexMetadata
    const { data: roomData } = await sc
      .from('corenull_rooms')
      .select('visibility')
      .eq('id', post.room_id ?? '')
      .single()
    const room = roomData as { visibility: string } | null
    if (!room || room.visibility !== 'public') return noindexMetadata
    const preview = post.content?.slice(0, 100) || ''
    const firstImage = post.meta?.media?.find((m) => m.type === 'image')
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

export async function getHouseMetadata(houseId: string): Promise<Metadata> {
  try {
    const supabase = getSupabase()
    if (!supabase) return noindexMetadata
    const { data } = await supabase
      .from('corenull_houses')
      .select('title, description')
      .eq('id', houseId)
      .single()
    const house = data as { title: string | null; description: string | null } | null
    if (!house) return noindexMetadata
    return {
      title: house.title ?? 'CoreNull',
      description: house.description || `${house.title} — CoreNull`,
      openGraph: {
        title: house.title ?? 'CoreNull',
        description: house.description || `${house.title} — CoreNull`,
        url: `${BASE_URL}/houses/${houseId}`,
        type: 'website',
      },
    }
  } catch {
    return noindexMetadata
  }
}