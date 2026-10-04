import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Recalcule et corrige la ligne daily_budget d'UNE date passée, en relisant
// les vraies données 'pas' et 'seances' de cette date — utile quand le budget
// a été figé avec kcal_pas: 0 parce que la synchro Apple Health n'était pas
// encore arrivée au moment du premier chargement de la page ce jour-là.
export async function POST(req) {
  try {
    const { date } = await req.json()
    if (!date) {
      return Response.json({ error: 'date manquante (format YYYY-MM-DD)' }, { status: 400 })
    }

    const [{ data: objectifs }, { data: pasJour }, { data: seancesJour }] = await Promise.all([
      supabase.from('objectifs').select('*').limit(1).single(),
      supabase.from('pas').select('*').eq('date', date).maybeSingle(),
      supabase.from('seances').select('*').eq('date', date),
    ])

    const tmb = objectifs?.tmb || 1875
    const deficitCible = objectifs?.deficit_cible || 750

    const nbPas = pasJour?.nb_pas || 0
    const pasDesCourses = (seancesJour || [])
      .filter(s => s.type === 'course')
      .reduce((sum, s) => sum + Math.round((parseFloat(s.distance) || 0) * 1280), 0)
    const nbPasHorsCourse = Math.max(0, nbPas - pasDesCourses)
    const kcalPas = Math.round(nbPasHorsCourse * 0.04)

    const kcalSport = (seancesJour || []).reduce((s, r) => s + (r.kcal || 0), 0)
    const tef = Math.round(tmb * 0.10)
    const depenseTotal = tmb + kcalSport + kcalPas + tef
    const budgetJour = Math.max(1200, depenseTotal - deficitCible)

    const { error } = await supabase.from('daily_budget').upsert(
      {
        date,
        budget_jour: budgetJour,
        tmb,
        kcal_pas: kcalPas,
        kcal_sport: kcalSport,
        tef,
        deficit_cible: deficitCible,
      },
      { onConflict: 'date' }
    )

    if (error) throw error

    return Response.json({
      success: true,
      date,
      avant: { nbPas, kcalPas },
      budgetRecalcule: { budgetJour, kcalPas, kcalSport, tmb, tef },
    })
  } catch (e) {
    console.error('Erreur recalcul budget:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}