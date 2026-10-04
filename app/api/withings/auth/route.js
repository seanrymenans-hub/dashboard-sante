import { NextResponse } from 'next/server'
import { withingsRedirectUri } from '../../../../lib/withings/server'

export async function GET(request) {
  if (!process.env.WITHINGS_CLIENT_ID) return Response.json({ error: 'WITHINGS_CLIENT_ID manquant' }, { status: 500 })
  const state = crypto.randomUUID()
  const redirectUri = withingsRedirectUri(request)
  const url = new URL('https://account.withings.com/oauth2_user/authorize2')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', process.env.WITHINGS_CLIENT_ID)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'user.metrics,user.activity')
  url.searchParams.set('redirect_uri', redirectUri)

  const response = NextResponse.redirect(url)
  response.cookies.set('withings_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' })
  return response
}
