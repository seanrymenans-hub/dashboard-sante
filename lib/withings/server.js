import { createClient } from '@supabase/supabase-js'

export const serverSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export function withingsRedirectUri(request) {
  if (process.env.WITHINGS_REDIRECT_URI) return process.env.WITHINGS_REDIRECT_URI
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  return `${base.replace(/\/$/, '')}/api/withings/callback`
}

export async function refreshWithingsToken(token) {
  const res = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      action: 'requesttoken', grant_type: 'refresh_token', client_id: process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET, refresh_token: token.refresh_token,
    })
  })
  const data = await res.json()
  if (data.status !== 0 || !data.body?.access_token) throw new Error('Impossible de renouveler la connexion Withings')
  await serverSupabase.from('withings_tokens').update({
    access_token: data.body.access_token,
    refresh_token: data.body.refresh_token,
    updated_at: new Date().toISOString()
  }).eq('userid', token.userid)
  return data.body.access_token
}
