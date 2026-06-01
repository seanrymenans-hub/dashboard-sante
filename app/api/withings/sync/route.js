import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function refreshToken(token) {
  const res = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: process.env.WITHINGS_CLIENT_ID,
      client_secret: process.env.WITHINGS_CLIENT_SECRET,
      refresh_token: token.refresh_token,
    })
  })
  const data = await res.json()
  if (data.status === 0) {
    await supabase.from('withings_tokens').update({
      access_token: data.body.access_token,
      refresh_token: data.body.refresh_token,
      updated_at: new Date().toISOString()
    }).eq('userid', token.userid)
    return data.body.access_token
  }
  return token.access_token
}

export async function GET(request) {
  const { data: tokens } = await supabase.from('withings_tokens').select('*').limit(1).single()
  if (!tokens) return Response.json({ error: 'Non connecté à Withings' }, { status: 401 })

  const access_token = await refreshToken(tokens)
  const startdate = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60

  const measRes = await fetch('https://wbsapi.withings.net/measure?action=getmeas&meastypes=1,6,8,11,76,77,88&category=1&startdate=' + startdate, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  })

  const measData = await measRes.json()
  if (measData.status !== 0) {
    return Response.json({ error: 'Erreur Withings', details: measData }, { status: 400 })
  }

  const groups = measData.body?.measuregrps || []

  if (request.url.includes('debug=1')) {
    const allTypes = groups.flatMap(g => g.measures.map(m => m.type))
    const uniqueTypes = [...new Set(allTypes)]
    return Response.json({ types: uniqueTypes, sample: groups[0] })
  }

  let synced = 0

  for (const group of groups) {
    const date = new Date(group.date * 1000).toISOString().split('T')[0]
    const measures = {}

    for (const m of group.measures) {
      const val = m.value * Math.pow(10, m.unit)
      if (m.type === 1) measures.poids = val
      if (m.type === 6) measures.masse_grasse_pct = val
      if (m.type === 8) measures.masse_hydrique_pct = val
      if (m.type === 11) measures.graisse_viscerale = val / 10
      if (m.type === 76) measures.masse_musculaire = val
      if (m.type === 77) measures.masse_maigre = val
      if (m.type === 88) measures.masse_osseuse = val
    }

    if (measures.poids) {
      await supabase.from('poids').upsert(
        { date, valeur: Math.round(measures.poids * 10) / 10 },
        { onConflict: 'date' }
      )
    }

    const compFields = ['masse_grasse_pct', 'masse_hydrique_pct', 'masse_musculaire', 'masse_maigre', 'masse_osseuse', 'graisse_viscerale']
    if (compFields.some(f => measures[f] !== undefined)) {
      const { data: existing } = await supabase.from('composition').select('*').eq('date', date).single()

      const poids = measures.poids || existing?.poids_ref || 82.3
      const masse_grasse_pct = measures.masse_grasse_pct ?? existing?.masse_grasse_pct ?? 0
      const masse_hydrique_pct = measures.masse_hydrique_pct ?? existing?.masse_hydrique_pct ?? 0
      const masse_musculaire = measures.masse_musculaire ?? existing?.masse_musculaire ?? 0
      const masse_musculaire_pct = poids > 0 ? Math.round((masse_musculaire / poids) * 1000) / 10 : 0

      const updated = {
        date,
        masse_grasse_pct: Math.round(masse_grasse_pct * 10) / 10,
        masse_grasse: Math.round((poids * masse_grasse_pct / 100) * 10) / 10,
        masse_hydrique_pct: Math.round(masse_hydrique_pct * 10) / 10,
        masse_hydrique: Math.round((poids * masse_hydrique_pct / 100) * 10) / 10,
        masse_musculaire: Math.round(masse_musculaire * 10) / 10,
        masse_musculaire_pct,
        graisse_viscerale: Math.round(((measures.graisse_viscerale ?? existing?.graisse_viscerale) || 0) * 10) / 10,
        masse_maigre: Math.round(((measures.masse_maigre ?? existing?.masse_maigre) || 0) * 10) / 10,
        masse_osseuse: Math.round(((measures.masse_osseuse ?? existing?.masse_osseuse) || 0) * 10) / 10,
      }
      await supabase.from('composition').upsert(updated, { onConflict: 'date' })
      synced++
    }
  }

  return Response.json({ success: true, synced, total: groups.length })
}