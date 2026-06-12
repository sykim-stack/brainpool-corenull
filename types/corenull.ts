// CoreNull Phase 2 타입 정의

export type OwnerKey = string // 현재: device_id / 미래: user_id

export type Visibility = 'public' | 'friend' | 'family'
export type RoomType = 'normal' | 'seed'
export type MessageType = 'post' | 'comment' | 'chat' | 'seed'

export interface House {
  id: string
  slug: string | null
  owner_key: OwnerKey
  title: string
  description: string | null
  primary_language: string
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  house_id: string
  room_name: string
  room_type: RoomType
  visibility: Visibility
  seed_mode: boolean       // 씨앗 방 여부 (구 event_mode)
  bloom_date: string | null // 꽃 피는 날 (구 event_date)
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
  corenull_rooms?: {
    id: string
    room_name: string
  }
}

export interface Bookmark {
  id: string
  owner_key: OwnerKey
  room_id: string | null
  message_id: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface HouseMember {
  device_id: OwnerKey
  house_id: string
  joined_at: string
}

export interface InviteToken {
  id: string
  invite_token: string
  house_id: string
  created_by: OwnerKey
  expired_at: string
  used_at: string | null
  used_by: OwnerKey | null
  created_at: string
}