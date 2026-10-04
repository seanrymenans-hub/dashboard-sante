import { NextResponse } from 'next/server'
import { serverSupabase, withingsRedirectUri } from '../../../../lib/withings/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieState = request.cookies.get('withings_oauth_state')?.value
  if (!code) return Response.json({ error: 'Code Withings manquant' }, { status: 400 })
  if (!state || !cookieState || state !== cookieState) return Response.json({ error: 'État OAuth invalide' }, { status: 400 })

  const redirectUri = withingsRedirectUri(request)
  const tokenRes = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      action: 'requesttoken', grant_type: 'authorization_code', client_id: process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET, code, redirect_uri: redirectUri,
    })
  })
  const tokenData = await tokenRes.json()
  // Ne jamais logger tokenData : il contient les credentials OAuth.
  if (tokenData.status !== 0 || !tokenData.body?.access_token) {
    console.error('Withings token exchange failed', { status: tokenData?.status })
    return Response.json({ error: 'Échec de connexion Withings' }, { status: 400 })
  }

  const { access_token, refresh_token, userid } = tokenData.body
  await serverSupabase.from('withings_tokens').upsert({ userid: String(userid), access_token, refresh_token, updated_at: new Date().toISOString() })

  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')
  const response = NextResponse.redirect(`${base}?withings=connected`)
  response.cookies.delete('withings_oauth_state')
  return response
}
