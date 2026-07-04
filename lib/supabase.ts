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