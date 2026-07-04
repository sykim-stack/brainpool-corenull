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

    if (!room || (room as any).visibility !== 'public') return noindexMetadata

    const roomName = (room as any).room_name || ''

    return {
      title: roomName,
      description: `${roomName} — CoreNull`,
      openGraph: {
        title: roomName,
        description: `${roomName} — CoreNull`,
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
      .eq('id', (post as any).room_id)
      .single()

    if (!room || (room as any).visibility !== 'public') return noindexMetadata

    const meta = (post as any).meta as any
    const preview = ((post as any).content as string)?.slice(0, 100) || ''
    const firstImage = Array.isArray(meta?.media)
      ? meta.media.find((m: any) => m.type === 'image')
      : null

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

    const title = (house as any).title || ''
    const description = (house as any).description || `${title} — CoreNull`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/houses/${houseId}`,
        type: 'website',
      },
    }
  } catch {
    return noindexMetadata
  }
}