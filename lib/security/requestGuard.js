export function isTrustedBrowserRequest(request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const secFetchSite = request.headers.get('sec-fetch-site')
  const allowed = [process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null]
    .filter(Boolean)
    .map(x => String(x).replace(/\/$/, ''))

  // En local ou appel serveur interne, Origin peut être absent.
  if (!origin && !referer) return true
  if (secFetchSite === 'same-origin') return true
  if (secFetchSite && !['same-site', 'none'].includes(secFetchSite)) return false
  if (!allowed.length) return true

  const candidate = (origin || referer || '').replace(/\/$/, '')
  return allowed.some(base => candidate === base || candidate.startsWith(`${base}/`))
}

export function rejectUntrusted(request) {
  if (isTrustedBrowserRequest(request)) return null
  return Response.json({ error: 'Requête non autorisée' }, { status: 403 })
}
