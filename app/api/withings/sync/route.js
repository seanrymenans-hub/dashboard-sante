import { serverSupabase as supabase, refreshWithingsToken } from '../../../../lib/withings/server'
import { rejectUntrusted } from '../../../../lib/security/requestGuard'

export async function GET(request) {
  const rejected = rejectUntrusted(request)
  if (rejected) return rejected
  try {
    const url = new URL(request.url)
    const syncPasOnly = url.searchParams.get('pas') === '1'
    const { data: tokens } = await supabase.from('withings_tokens').select('*').limit(1).single()
    if (!tokens) return Response.json({ error: 'Non connecté à Withings' }, { status: 401 })

    const accessToken = await refreshWithingsToken(tokens)
    const startdate = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60
    const startdateStr = new Date(startdate * 1000).toISOString().split('T')[0]
    const enddateStr = new Date().toISOString().split('T')[0]

    const actRes = await fetch(`https://wbsapi.withings.net/v2/measure?action=getactivity&startdateymd=${startdateStr}&enddateymd=${enddateStr}&data_fields=steps,calories,distance`, { headers: { Authorization: `Bearer ${accessToken}` } })
    const actData = await actRes.json()
    let pasSynced = 0
    if (actData.status === 0 && actData.body?.activities) {
      for (const activity of actData.body.activities) {
        if (Number(activity.steps) > 0) {
          const caloriesPasCalculees = Math.round(Number(activity.steps) * 0.04)
          await supabase.from('pas').upsert({ date: activity.date, nb_pas: activity.steps, calories_pas: caloriesPasCalculees, distance_m: Math.round(activity.distance || 0), source: 'withings' }, { onConflict: 'date' })
          pasSynced++
        }
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    await fetch(`${appUrl.replace(/\/$/, '')}/api/daily-budget/upsert`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-health-engine-internal': process.env.HEALTH_ENGINE_INTERNAL_KEY || '' }, body: JSON.stringify({ date: today }) }).catch(() => null)
    if (syncPasOnly) return Response.json({ success: true, pasSynced })

    const measRes = await fetch('https://wbsapi.withings.net/measure?action=getmeas&meastypes=1,5,6,8,71,73,76,77,88,174,175,176&category=1&startdate=' + startdate, { headers: { Authorization: `Bearer ${accessToken}` } })
    const measData = await measRes.json()
    if (measData.status !== 0) return Response.json({ error: 'Erreur Withings', code: measData.status }, { status: 400 })

    const groups = measData.body?.measuregrps || []
    let synced = 0
    for (const group of groups) {
      const date = new Date(group.date * 1000).toISOString().split('T')[0]
      const measures = {}
      for (const m of group.measures || []) {
        const val = m.value * Math.pow(10, m.unit)
        if (m.type === 1) measures.poids = val
        if (m.type === 6) measures.masse_grasse_pct = val
        if (m.type === 76) measures.masse_musculaire = val
        if (m.type === 77) measures.masse_hydrique = val
        if (m.type === 88) measures.masse_osseuse = val
      }

      if (Number(measures.poids) > 0) await supabase.from('poids').upsert({ date, valeur: Math.round(measures.poids * 10) / 10 }, { onConflict: 'date' })
      const compFields = ['masse_grasse_pct', 'masse_musculaire', 'masse_hydrique', 'masse_osseuse']
      if (compFields.some(f => measures[f] !== undefined)) {
        const [{ data: existing }, { data: weightRow }] = await Promise.all([
          supabase.from('composition').select('*').eq('date', date).maybeSingle(),
          supabase.from('poids').select('valeur').eq('date', date).maybeSingle(),
        ])
        const weight = Number(measures.poids || weightRow?.valeur || 0) || null
        const updated = { date }
        if (measures.masse_grasse_pct !== undefined) updated.masse_grasse_pct = Math.round(measures.masse_grasse_pct * 10) / 10
        if (measures.masse_musculaire !== undefined) updated.masse_musculaire = Math.round(measures.masse_musculaire * 10) / 10
        if (measures.masse_hydrique !== undefined) updated.masse_hydrique = Math.round(measures.masse_hydrique * 10) / 10
        if (measures.masse_osseuse !== undefined) updated.masse_osseuse = Math.round(measures.masse_osseuse * 10) / 10

        const fatPct = measures.masse_grasse_pct ?? existing?.masse_grasse_pct
        const muscle = measures.masse_musculaire ?? existing?.masse_musculaire
        const water = measures.masse_hydrique ?? existing?.masse_hydrique
        if (weight && Number.isFinite(Number(fatPct))) {
          updated.masse_grasse = Math.round(weight * Number(fatPct) / 100 * 10) / 10
          updated.masse_maigre = Math.round((weight - updated.masse_grasse) * 10) / 10
        }
        if (weight && Number.isFinite(Number(muscle))) updated.masse_musculaire_pct = Math.round(Number(muscle) / weight * 1000) / 10
        if (weight && Number.isFinite(Number(water))) updated.masse_hydrique_pct = Math.round(Number(water) / weight * 1000) / 10
        await supabase.from('composition').upsert(updated, { onConflict: 'date' })
        synced++
      }
    }
    return Response.json({ success: true, synced, total: groups.length, pasSynced })
  } catch (e) {
    console.error('Withings sync error', e?.message)
    return Response.json({ error: e?.message || 'Erreur de synchronisation Withings' }, { status: 500 })
  }
}
