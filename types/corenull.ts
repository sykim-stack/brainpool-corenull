// CoreNull Phase 1 타입 정의

export type OwnerKey = string // 현재: device_id / 미래: user_id

export type Visibility = 'public' | 'friend' | 'family'
export type RoomType = 'normal' | 'event'
export type MessageType = 'post' | 'comment' | 'chat' | 'event'

export interface House {
  id: string
  slug: string | null
  owner_key: OwnerKey
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  house_id: string
  room_name: string
  room_type: RoomType
  visibility: Visibility
  event_mode: boolean
  slug: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  room_id: string
  type: MessageType
  content: string
  meta: Record<string, unknown>
  relations: Record<string, unknown>
  created_at: string
}

export interface Footprint {
  id: string
  owner_key: OwnerKey
  room_id: string
  visited_at: string
}

export interface Bookmark {
  id: string
  owner_key: OwnerKey
  room_id: string | null       // 방 북마크
  message_id: string | null    // 포스트 북마크
  created_at: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
  created_at: string
}
