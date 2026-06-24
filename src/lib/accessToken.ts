import { supabase } from './supabase'

/** Fresh access token for brain API calls (refreshes when expired or expiring soon). */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session) return null

  const expiresAt = sessionData.session.expires_at ?? 0
  const now = Math.floor(Date.now() / 1000)

  if (expiresAt > now + 60) {
    return sessionData.session.access_token
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshed.session) return null

  return refreshed.session.access_token
}
