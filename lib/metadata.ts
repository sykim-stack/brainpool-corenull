// lib/metadata.ts
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

    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!room || room.visibility !== 'public') return noindexMetadata

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

export async function getPostMetadata(postId: string): Promise<Metadata> {
  try {
    const supabase = getSupabase()
    if (!supabase) return noindexMetadata

    const { data: post } = await supabase
      .from('messages')
      .select('*')
      .eq('id', postId)
      .single()

    if (!post) return noindexMetadata

    const { data: room } = await supabase
      .from('corenull_rooms')
      .select('visibility')
      .eq('id', post.room_id)
      .single()

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

export async function getHouseMetadata(houseId: string): Promise<Metadata> {
  try {
    const supabase = getSupabase()
    if (!supabase) return noindexMetadata

    const { data: house } = await supabase
      .from('corenull_houses')
      .select('*')
      .eq('id', houseId)
      .single()

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