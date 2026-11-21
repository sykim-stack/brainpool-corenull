// Resolve existing CoreNull Owner from Supabase Auth user id.
// Policy: existing link only. Never create or merge Owner.

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} authUserId
 * @returns {Promise<{ ok: true, ownerKey: string } | { ok: false, error: string }>}
 */
export async function resolveCoreNullOwnerByAuthUserId(supabase, authUserId) {
  if (typeof authUserId !== 'string' || !authUserId.trim()) {
    return { ok: false, error: 'invalid_subject' }
  }

  try {
    // Primary: provider=supabase (or auth) + provider_sub = auth user id
    const { data, error } = await supabase
      .from('corenull_owner_identities')
      .select('owner_key')
      .eq('provider', 'supabase')
      .eq('provider_sub', authUserId)
      .maybeSingle()

    if (error) {
      return { ok: false, error: 'owner_mapping_unavailable' }
    }

    if (data?.owner_key && typeof data.owner_key === 'string' && data.owner_key.trim()) {
      return { ok: true, ownerKey: data.owner_key }
    }

    // Fallback: some deployments may have used provider='auth'
    const { data: alt, error: altError } = await supabase
      .from('corenull_owner_identities')
      .select('owner_key')
      .eq('provider', 'auth')
      .eq('provider_sub', authUserId)
      .maybeSingle()

    if (altError) {
      return { ok: false, error: 'owner_mapping_unavailable' }
    }

    if (alt?.owner_key && typeof alt.owner_key === 'string' && alt.owner_key.trim()) {
      return { ok: true, ownerKey: alt.owner_key }
    }

    // No existing link → refuse (do not create / merge)
    return { ok: false, error: 'owner_link_required' }
  } catch {
    return { ok: false, error: 'owner_mapping_unavailable' }
  }
}
