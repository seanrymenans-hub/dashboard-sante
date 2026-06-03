export async function GET() {
  const clientId = process.env.WITHINGS_CLIENT_ID
  const redirectUri = 'https://dashboard-sante-kappa.vercel.app/api/withings/callback'
  const scope = 'user.metrics,user.activity'
  const state = 'dashboard-sante'

  const url = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`

  return Response.redirect(url)
}