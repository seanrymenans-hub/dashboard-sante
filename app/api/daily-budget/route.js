import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function POST(request) {
  try {
    const { date } = await request.json()
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Récupérer toutes les données nécessaires pour recalculer le budget
    const [objectifsRes, pasRes, seancesRes] = await Promise.all([
      supabase.from('objectifs').select('*').limit(1).single(),
      supabase.from('pas').select('*').eq('date', targetDate).maybeSingle(),
      supabase.from('seances').select('*').eq('date', targetDate),
    ])

    const objectifs = objectifsRes.data
    const pasData = pasRes.data
    const seances = seancesRes.data || []

    // Reproduire exactement la logique de computeHealthEngine
    const tmb = objectifs?.tmb || 1875
    const deficitCible = objectifs?.deficit_cible || 750

    const kcalSport = seances.reduce((s, r) => s + (r.kcal || 0), 0)

    const nbPas = pasData?.nb_pas || 0
    const pasDesCourses = seances
      .filter(s => s.type === 'course')
      .reduce((sum, s) => sum + Math.round((parseFloat(s.distance) || 0) * 1280), 0)
    const nbPasHorsCourse = Math.max(0, nbPas - pasDesCourses)
    const kcalPas = Math.round(nbPasHorsCourse * 0.04)

    const tef = Math.round(tmb * 0.1)
    const depenseTotal = tmb + kcalSport + kcalPas + tef
    const budgetJour = Math.max(1200, depenseTotal - deficitCible)

    const { error } = await supabase.from('daily_budget').upsert(
      {
        date: targetDate,
        budget_jour: budgetJour,
        tmb,
        kcal_pas: kcalPas,
        kcal_sport: kcalSport,
        tef,
        deficit_cible: deficitCible,
      },
      { onConflict: 'date' }
    )

    if (error) {
      console.error('Erreur upsert daily_budget:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ daily_budget recalculé pour ${targetDate}: budget=${budgetJour}, pas=${kcalPas}, sport=${kcalSport}`)
    return Response.json({ success: true, date: targetDate, budgetJour, kcalPas, kcalSport })
  } catch (e) {
    console.error('Erreur daily-budget/upsert:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}