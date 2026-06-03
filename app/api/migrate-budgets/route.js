import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function GET() {
  const tmb = 1901
  const tef = Math.round(tmb * 0.10)
  const deficitCible = 750

  // Charger toutes les données
  const [{ data: pas }, { data: seances }, { data: objectifs }] = await Promise.all([
    supabase.from('pas').select('*'),
    supabase.from('seances').select('*'),
    supabase.from('objectifs').select('*').limit(1).single(),
  ])

  const tmb_ = objectifs?.tmb || tmb
  const tef_ = Math.round(tmb_ * 0.10)
  const deficit_ = objectifs?.deficit_cible || deficitCible

  // Générer les 90 derniers jours
  const budgets = []
  for (let i = 0; i < 90; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const pasJour = pas?.find(p => p.date === date)
    const pasDesCourses = seances
      ?.filter(s => s.date === date && s.type === 'course')
      ?.reduce((sum, s) => sum + Math.round((parseFloat(s.distance) || 0) * 1280), 0) || 0
    const nbPasHorsCourse = Math.max(0, (pasJour?.nb_pas || 0) - pasDesCourses)
    const kcalPas = Math.round(nbPasHorsCourse * 0.04)

    const kcalSport = seances
      ?.filter(s => s.date === date)
      ?.reduce((sum, s) => sum + (s.kcal || 0), 0) || 0

    const depenseTotal = tmb_ + tef_ + kcalPas + kcalSport
    const budgetJour = Math.max(1200, depenseTotal - deficit_)

    budgets.push({
      date,
      budget_jour: budgetJour,
      tmb: tmb_,
      kcal_pas: kcalPas,
      kcal_sport: kcalSport,
      tef: tef_,
      deficit_cible: deficit_,
    })
  }

  const { error } = await supabase.from('daily_budget').upsert(budgets, { onConflict: 'date' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, count: budgets.length })
}