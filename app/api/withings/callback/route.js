import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return Response.json({ error: 'No code' }, { status: 400 })
  }

  const redirectUri = 'https://dashboard-sante-kappa.vercel.app/api/withings/callback'

  const tokenRes = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'authorization_code',
      client_id: process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    })
  })

  const tokenData = await tokenRes.json()
  console.log('Token data:', JSON.stringify(tokenData))

  if (tokenData.status !== 0) {
    return Response.json({ error: 'Token error', details: tokenData }, { status: 400 })
  }

  const { access_token, refresh_token, userid } = tokenData.body

  await supabase.from('withings_tokens').upsert({
    userid: String(userid),
    access_token,
    refresh_token,
    updated_at: new Date().toISOString()
  })

  return Response.redirect('https://dashboard-sante-kappa.vercel.app?withings=connected')
}