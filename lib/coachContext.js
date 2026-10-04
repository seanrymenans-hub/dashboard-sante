const DAY = 1000 * 60 * 60 * 24

function dateOnly(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysAgo(value) {
  const d = dateOnly(value)
  if (!d) return Infinity
  const now = dateOnly(new Date())
  return Math.floor((now.getTime() - d.getTime()) / DAY)
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function round(v, digits = 1) {
  if (!Number.isFinite(v)) return null
  const p = 10 ** digits
  return Math.round(v * p) / p
}

function entriesWithin(arr = [], days = 7) {
  return arr.filter(x => daysAgo(x?.date) >= 0 && daysAgo(x?.date) <= days)
}

function uniqueDays(arr = [], days = 7) {
  return [...new Set(entriesWithin(arr, days).map(x => x?.date).filter(Boolean))]
}

function nearestOlder(entries = [], days = 7, field = 'valeur') {
  if (!entries.length) return null
  const latest = entries[0]
  const latestDate = dateOnly(latest?.date)
  if (!latestDate) return null
  const target = latestDate.getTime() - days * DAY
  let best = null
  let bestDistance = Infinity
  for (const item of entries.slice(1)) {
    const d = dateOnly(item?.date)
    const value = num(item?.[field])
    if (!d || value === null) continue
    const distance = Math.abs(d.getTime() - target)
    if (distance < bestDistance) {
      best = item
      bestDistance = distance
    }
  }
  return best
}

function weightDelta(poids = [], days = 7) {
  const latest = poids?.[0]
  const latestValue = num(latest?.valeur)
  const older = nearestOlder(poids, days, 'valeur')
  const olderValue = num(older?.valeur)
  if (latestValue === null || olderValue === null) return null
  return round(latestValue - olderValue, 1)
}

function compositionDelta(composition = [], days = 30, field) {
  const latest = composition?.[0]
  const latestValue = num(latest?.[field])
  const older = nearestOlder(composition, days, field)
  const olderValue = num(older?.[field])
  if (latestValue === null || olderValue === null) return null
  return round(latestValue - olderValue, 1)
}

function sportSummary(seances = [], days = 7) {
  const current = entriesWithin(seances, days)
  const previous = seances.filter(s => {
    const age = daysAgo(s?.date)
    return age > days && age <= days * 2
  })
  const totalMinutes = current.reduce((s, x) => s + (num(x?.duree) || 0), 0)
  const totalKcal = current.reduce((s, x) => s + (num(x?.kcal) || 0), 0)
  const runs = current.filter(x => x?.type === 'course')
  const strength = current.filter(x => ['renfo', 'musculation', 'strength'].includes(String(x?.type || '').toLowerCase()))
  const other = current.length - runs.length - strength.length
  const runKm = runs.reduce((s, x) => s + (num(x?.distance) || 0), 0)
  const prevMinutes = previous.reduce((s, x) => s + (num(x?.duree) || 0), 0)
  const volumeChange = prevMinutes > 0 ? Math.round(((totalMinutes - prevMinutes) / prevMinutes) * 100) : null
  return { sessions: current.length, totalMinutes, totalKcal, runs: runs.length, strength: strength.length, other, runKm: round(runKm, 1), volumeChange }
}

function nutritionSummary(repas = [], tendances = {}, days = 7) {
  const trackedDays = uniqueDays(repas, days)
  const meals = entriesWithin(repas, days)
  const totalProtein = meals.reduce((s, x) => s + (num(x?.proteines) || 0), 0)
  const avgProtein = trackedDays.length ? Math.round(totalProtein / trackedDays.length) : null
  const totalKcal = meals.reduce((s, x) => s + (num(x?.kcal) || 0), 0)
  const avgKcal = trackedDays.length ? Math.round(totalKcal / trackedDays.length) : null
  const pctRespect = trackedDays.length ? tendencias?.pctRespect7j ?? null : null
  return { trackedDays: trackedDays.length, avgProtein, avgKcal, pctRespect }
}

function stepsSummary(pas = [], days = 7) {
  const rows = entriesWithin(pas, days).filter(x => num(x?.nb_pas) !== null)
  if (!rows.length) return { trackedDays: 0, average: null, today: null }
  const average = Math.round(rows.reduce((s, x) => s + Number(x.nb_pas || 0), 0) / rows.length)
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayRow = pas.find(x => x?.date === todayKey)
  return { trackedDays: rows.length, average, today: num(todayRow?.nb_pas) }
}

function quality(status, label, detail) {
  return { status, label, detail }
}

export function buildCoachContext(raw = {}, horizon = '7d') {
  const { poids = [], repas = [], seances = [], composition = [], objectifs = {}, pas = [], hydratation = [], budget = {}, progression = {}, tendances = {}, macros = {} } = raw
  const horizonDays = horizon === 'today' ? 0 : horizon === '30d' ? 30 : 7
  const today = new Date().toISOString().slice(0, 10)
  const mealsToday = repas.filter(x => x?.date === today)
  const sessionsToday = seances.filter(x => x?.date === today)
  const nutrition7 = nutritionSummary(repas, tendances, 7)
  const nutrition30 = nutritionSummary(repas, tendances, 30)
  const sport7 = sportSummary(seances, 7)
  const sport30 = sportSummary(seances, 30)
  const steps7 = stepsSummary(pas, 7)
  const weight7 = weightDelta(poids, 7)
  const weight30 = weightDelta(poids, 30)
  const fat30 = compositionDelta(composition, 30, 'masse_grasse')
  const muscle30 = compositionDelta(composition, 30, 'masse_musculaire')
  const latestWeight = num(poids?.[0]?.valeur)
  const latestComp = composition?.[0] || null

  const dataQuality = {
    weight: poids.length >= 5 ? quality('good_data', 'Poids', `${poids.length} mesures disponibles`) : poids.length >= 2 ? quality('partial_data', 'Poids', `${poids.length} mesures disponibles`) : quality('insufficient_data', 'Poids', poids.length ? '1 seule mesure' : 'Aucune mesure'),
    nutrition: nutrition7.trackedDays >= 5 ? quality('good_data', 'Nutrition', `${nutrition7.trackedDays}/7 jours suivis`) : nutrition7.trackedDays >= 2 ? quality('partial_data', 'Nutrition', `${nutrition7.trackedDays}/7 jours suivis`) : quality('insufficient_data', 'Nutrition', nutrition7.trackedDays ? `${nutrition7.trackedDays}/7 jour suivi` : 'Aucun jour suivi'),
    activity: sport7.sessions >= 2 || steps7.trackedDays >= 4 ? quality('good_data', 'Activité', `${sport7.sessions} séances · ${steps7.trackedDays}/7 jours de pas`) : (sport7.sessions || steps7.trackedDays) ? quality('partial_data', 'Activité', `${sport7.sessions} séance(s) · ${steps7.trackedDays}/7 jours de pas`) : quality('insufficient_data', 'Activité', 'Peu ou pas de données récentes'),
    composition: composition.length >= 3 ? quality('good_data', 'Composition', `${composition.length} mesures disponibles`) : composition.length >= 1 ? quality('partial_data', 'Composition', `${composition.length} mesure(s) disponible(s)`) : quality('not_available', 'Composition', 'Aucune mesure disponible'),
  }

  return {
    horizon,
    horizonDays,
    generatedAt: new Date().toISOString(),
    profile: {
      weightCurrent: latestWeight,
      weightTarget: num(objectifs?.poids_objectif) ?? 70,
      weightStart: num(objectifs?.poids_depart),
      lostKg: num(progression?.kgPerdus),
      remainingKg: num(progression?.kgRestants),
      progressionPct: num(progression?.progressionPct),
      bmr: num(objectifs?.tmb),
      targetDeficit: num(objectifs?.deficit_cible),
    },
    today: {
      caloriesLogged: mealsToday.length ? mealsToday.reduce((s, x) => s + (num(x?.kcal) || 0), 0) : null,
      mealsLogged: mealsToday.length,
      budget: num(budget?.budgetJour),
      proteinTarget: num(macros?.proteines),
      steps: steps7.today,
      sessions: sessionsToday.map(x => ({ type: x?.type, name: x?.nom, duration: num(x?.duree), kcal: num(x?.kcal) })),
      hydrationLiters: (() => {
        const row = hydratation.find(x => x?.date === today)
        if (!row) return null
        const ml = num(row?.verres)
        return ml === null ? null : round(ml / 1000, 1)
      })(),
    },
    weight: { delta7d: weight7, delta30d: weight30, count: poids.length },
    nutrition: { d7: nutrition7, d30: nutrition30 },
    activity: { d7: sport7, d30: sport30, steps7 },
    composition: {
      current: latestComp ? {
        fatKg: num(latestComp?.masse_grasse),
        fatPct: num(latestComp?.masse_grasse_pct),
        muscleKg: num(latestComp?.masse_musculaire),
        waterKg: num(latestComp?.masse_hydrique),
      } : null,
      fatDelta30d: fat30,
      muscleDelta30d: muscle30,
      count: composition.length,
    },
    dataQuality,
  }
}

export function computeCoachInsights(ctx) {
  const insights = []
  const add = (domain, title, detail, tone = 'neutral', question) => insights.push({ domain, title, detail, tone, question })

  if (ctx.weight.delta30d !== null) {
    const d = ctx.weight.delta30d
    add('Poids', d < 0 ? `Poids en baisse de ${Math.abs(d).toFixed(1)} kg` : d > 0 ? `Poids en hausse de ${d.toFixed(1)} kg` : 'Poids globalement stable', 'Variation approximative sur 30 jours, à lire comme une tendance et non comme un verdict quotidien.', d < 0 ? 'positive' : d > 0 ? 'watch' : 'neutral', 'Que signifie ma tendance de poids sur 30 jours ?')
  } else {
    add('Poids', 'Tendance encore fragile', 'Il manque assez de pesées comparables pour lire proprement la trajectoire.', 'neutral', 'Est-ce que j’ai assez de données de poids pour conclure ?')
  }

  if (ctx.nutrition.d7.trackedDays < 3) {
    add('Nutrition', 'Nutrition peu documentée', `${ctx.nutrition.d7.trackedDays}/7 jour(s) suivi(s) : insuffisant pour relier alimentation et évolution du poids.`, 'neutral', 'Quelles conclusions peux-tu vraiment tirer de ma nutrition ?')
  } else if (ctx.nutrition.d7.avgProtein !== null && ctx.today.proteinTarget) {
    const ratio = ctx.nutrition.d7.avgProtein / ctx.today.proteinTarget
    add('Nutrition', ratio >= 0.9 ? 'Protéines proches de la cible' : 'Protéines à renforcer', `${ctx.nutrition.d7.avgProtein} g/j en moyenne sur les jours suivis pour une cible d’environ ${ctx.today.proteinTarget} g.`, ratio >= 0.9 ? 'positive' : 'watch', 'Est-ce que mon apport en protéines est adapté ?')
  }

  if (ctx.activity.d7.sessions === 0) {
    add('Sport', 'Aucune séance récente enregistrée', 'Cela décrit le suivi disponible, pas nécessairement ton activité réelle.', 'neutral', 'Que peux-tu conclure de ma semaine sportive avec les données actuelles ?')
  } else {
    const { sessions, totalMinutes, runs, strength, volumeChange } = ctx.activity.d7
    let detail = `${sessions} séance(s), ${totalMinutes} min · ${runs} course(s) · ${strength} renfo.`
    if (volumeChange !== null) detail += ` Volume ${volumeChange > 0 ? '+' : ''}${volumeChange}% vs semaine précédente.`
    add('Sport', strength === 0 && runs > 0 ? 'Semaine très orientée cardio' : 'Charge sportive documentée', detail, strength === 0 && runs > 0 ? 'watch' : 'positive', 'Comment juges-tu l’équilibre de ma semaine sportive ?')
  }

  if (ctx.composition.current) {
    const fat = ctx.composition.fatDelta30d
    const muscle = ctx.composition.muscleDelta30d
    if (fat !== null || muscle !== null) {
      const parts = []
      if (fat !== null) parts.push(`masse grasse ${fat > 0 ? '+' : ''}${fat.toFixed(1)} kg`)
      if (muscle !== null) parts.push(`masse musculaire ${muscle > 0 ? '+' : ''}${muscle.toFixed(1)} kg`)
      add('Composition', 'Composition à lire en tendance', `${parts.join(' · ')} sur ~30 jours. Les mesures Withings par impédancemétrie restent sensibles à l’hydratation.`, 'neutral', 'Comment interpréter ma composition corporelle sans sur-réagir ?')
    }
  }

  return insights.slice(0, 4)
}

export function computeSuggestedQuestions(ctx, insights = computeCoachInsights(ctx)) {
  const questions = insights.map(x => x.question).filter(Boolean)
  if (ctx.today.mealsLogged === 0) questions.push('Que devrais-je prioriser aujourd’hui avec les données disponibles ?')
  if (ctx.activity.d7.sessions > 0) questions.push('Est-ce que ma charge actuelle est cohérente avec mon objectif ?')
  questions.push('Quel est le signal le plus important à surveiller cette semaine ?')
  return [...new Set(questions)].slice(0, 4)
}
