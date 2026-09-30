// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  if (!url || !key) return null

  try {
    supabaseInstance = createClient<Database>(url, key)
    return supabaseInstance
  } catch {
    return null
  }
}

// 서버 전용 admin 클라이언트 — RLS 우회. owner 매핑/민감 쓰기 전용.
// getSupabase(anon fallback)와 분리: 서버 쓰기는 절대 anon/RLS에 걸리지 않음.
// SUPABASE_SERVICE_ROLE_KEY 미설정 → null 반환(500) — 서버 쓰기는 명시적 service-role 필요.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    return createClient<Database>(url, key, { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } })
  } catch {
    return null
  }
}