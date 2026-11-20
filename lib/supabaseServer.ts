import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from './supabase'

/**
 * Server Component / Server Action / Route Handler에서 사용할 Supabase 클라이언트
 * next/headers의 cookies()를 통해 요청/응답 쿠키 자동 처리 (Next.js 15+ 비동기)
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 setAll 호출 시 에러 발생 가능 (쿠키 설정 불가)
            // 이 경우 무시하고 클라이언트 사이드에서 처리되도록 함
          }
        },
      },
    }
  )
}

/**
 * 현재 요청의 세션에서 사용자 정보 조회
 * 세션이 없으면 null 반환
 */
export async function getServerUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Supabase 사용자 → CoreNull owner_key[] 매핑
 * CoreHub의 resolveOwnerKeysFromBearer와 동일한 로직
 */
export async function resolveOwnerKeysFromUser(user: any): Promise<string[]> {
  if (!user || !user.id) return []

  const identities = Array.isArray(user.identities) ? user.identities : []
  const pairs: { provider: string; provider_sub: string }[] = []
  const seenPair = new Set<string>()

  for (const identity of identities) {
    if (!identity) continue
    const provider = normalizeProvider(identity.provider)
    if (!provider) continue

    const sub = firstNonEmpty(
      identity.identity_data?.sub,
      identity.provider_id,
      identity.id
    )
    if (!sub) continue

    const provider_sub = String(sub)
    const key = `${provider}\0${provider_sub}`
    if (seenPair.has(key)) continue
    seenPair.add(key)
    pairs.push({ provider, provider_sub })
  }

  if (pairs.length === 0) return []

  // 서비스 롤 클라이언트로 owner_identities 조회 (RLS 우회 필요)
  const adminClient = getSupabaseAdmin()
  if (!adminClient) return []

  try {
    const providers = [...new Set(pairs.map(p => p.provider))]
    const pairSet = new Set(pairs.map(p => `${p.provider}\0${p.provider_sub}`))

    const { data, error } = await adminClient
      .from('corenull_owner_identities')
      .select('owner_key, provider, provider_sub')
      .in('provider', providers)

    if (error) return []

    const rows = data || []
    const ownerKeys = uniqueNonEmpty(
      rows
        .filter(row => {
          if (!row) return false
          const prov = normalizeProvider(row.provider)
          const sub = row.provider_sub != null ? String(row.provider_sub) : ''
          return pairSet.has(`${prov}\0${sub}`)
        })
        .map(r => r.owner_key)
    )
    return ownerKeys
  } catch {
    return []
  }
}

function normalizeProvider(provider: unknown): string {
  if (provider == null) return ''
  return String(provider).trim().toLowerCase()
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s.length > 0) return s
  }
  return null
}

function uniqueNonEmpty(values: (string | null | undefined)[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of values) {
    if (!v) continue
    const s = String(v).trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}