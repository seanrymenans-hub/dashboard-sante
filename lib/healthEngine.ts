import { addDays, dateKey, daysAgo, parseDateKey } from './dateUtils'
import type { CompositionEntry, DailyBudgetEntry, Goals, HydrationEntry, MealEntry, StepsEntry, WeightEntry, WorkoutEntry } from './types'

export interface HealthData {
  poids: WeightEntry[]
  repas: MealEntry[]
  seances: WorkoutEntry[]
  composition: CompositionEntry[]
  objectifs: Goals | null
  pas?: StepsEntry[]
  hydratation?: HydrationEntry[]
  dailyBudgets?: DailyBudgetEntry[]
}

export interface DailyBudget {
  tmb: number
  kcalSport: number
  kcalPas: number
  kcalPasKnown: boolean
  depenseTotal: number
  deficitCible: number
  budgetJour: number
  kcalConsommees: number
  kcalRestantes: number
  surplusOuDeficit: number
  tefEstime: number
  budgetProvisoire: boolean
}

export interface MacrosObjectif { proteines: number; lipides: number; glucides: number }
export type TrendConfidence = 'élevée' | 'moyenne' | 'faible' | 'insuffisante'

export interface WeightTrend {
  kgPerWeek: number | null
  confidence: TrendConfidence
  samples: number
  spanDays: number
}

export interface ProgressionData {
  poidsActuel: number
  poidsObjectif: number
  poidsDepart: number
  kgPerdus: number
  kgRestants: number
  progressionPct: number
  dateEstimeeObjectif: Date | null
  tendance7j: number | null
  tendance14j: number | null
  tendance30j: number | null
  tendanceConfiance: TrendConfidence
  tendanceEchantillons: number
  projectionStatus: 'goal_reached' | 'on_track' | 'insufficient_data' | 'not_decreasing'
}

export interface TendancesData {
  moyKcal7j: number
  moyKcal14j: number
  moyKcal30j: number
  moyProt7j: number
  moyGluc7j: number
  moyLip7j: number
  joursRespectés7j: number
  joursRespectés14j: number
  joursRespectés30j: number
  pctRespect7j: number
  pctRespect14j: number
  pctRespect30j: number
  joursSuivis7j: number
  joursSuivis14j: number
  joursSuivis30j: number
}

export interface HealthEngineOutput {
  budget: DailyBudget
  progression: ProgressionData
  tendances: TendancesData
  macros: MacrosObjectif
  today: string
  quality: {
    stepsToday: 'available' | 'missing'
    nutrition7d: 'good' | 'partial' | 'insufficient'
    weightTrend: TrendConfidence
  }
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function validWeights(entries: WeightEntry[]) {
  return (entries || [])
    .filter(x => x?.date && Number.isFinite(Number(x?.valeur)) && Number(x.valeur) > 0)
    .map(x => ({ ...x, valeur: Number(x.valeur) }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

export function computeWeightTrend(entries: WeightEntry[] = [], windowDays = 14, today = dateKey()): WeightTrend {
  const points = validWeights(entries).filter(x => {
    const age = daysAgo(x.date, today)
    return age >= 0 && age < windowDays
  })
  if (points.length < 2) return { kgPerWeek: null, confidence: 'insuffisante', samples: points.length, spanDays: 0 }

  const firstDate = parseDateKey(points[0].date)
  const lastDate = parseDateKey(points[points.length - 1].date)
  if (!firstDate || !lastDate) return { kgPerWeek: null, confidence: 'insuffisante', samples: points.length, spanDays: 0 }
  const spanDays = Math.max(0, (lastDate.getTime() - firstDate.getTime()) / 86400000)
  if (spanDays < 2) return { kgPerWeek: null, confidence: 'insuffisante', samples: points.length, spanDays }

  const xs = points.map(p => {
    const d = parseDateKey(p.date)!
    return (d.getTime() - firstDate.getTime()) / 86400000
  })
  const ys = points.map(p => p.valeur)
  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length
  const denominator = xs.reduce((s, x) => s + Math.pow(x - xMean, 2), 0)
  if (!denominator) return { kgPerWeek: null, confidence: 'insuffisante', samples: points.length, spanDays }
  const slopePerDay = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0) / denominator
  const kgPerWeek = Math.round(slopePerDay * 7 * 100) / 100

  let confidence: TrendConfidence = 'faible'
  if (points.length >= 8 && spanDays >= 10) confidence = 'élevée'
  else if (points.length >= 4 && spanDays >= 6) confidence = 'moyenne'
  else if (points.length < 3 || spanDays < 4) confidence = 'insuffisante'

  return { kgPerWeek, confidence, samples: points.length, spanDays: Math.round(spanDays) }
}

function dateRangeMeals(repas: MealEntry[], days: number, today: string) {
  return [...new Set((repas || [])
    .filter(r => {
      const age = daysAgo(r.date, today)
      return age >= 0 && age < days
    })
    .map(r => r.date)
    .filter(Boolean))]
}

export function computeHealthEngine(data: HealthData): HealthEngineOutput {
  const { poids = [], repas = [], seances = [], objectifs, pas = [], dailyBudgets = [] } = data
  const today = dateKey()

  // ── Budget énergétique ──────────────────────────────────────────────
  const tmb = asNumber(objectifs?.tmb, 1875)
  const deficitCible = asNumber(objectifs?.deficit_cible, 750)
  const seancesAujourdhui = seances.filter(s => s.date === today)
  const kcalSport = Math.round(seancesAujourdhui.reduce((s, r) => s + asNumber(r.kcal), 0))

  const pasAujourdhui = pas.find(p => p.date === today)
  const kcalPasKnown = !!pasAujourdhui && Number.isFinite(Number(pasAujourdhui?.nb_pas))
  const nbPas = kcalPasKnown ? asNumber(pasAujourdhui?.nb_pas) : 0
  const pasDesCourses = seancesAujourdhui
    .filter(s => String(s.type).toLowerCase() === 'course')
    .reduce((sum, s) => sum + Math.round(asNumber(s.distance) * 1280), 0)
  const nbPasHorsCourse = Math.max(0, nbPas - pasDesCourses)
  const kcalPas = kcalPasKnown ? Math.round(nbPasHorsCourse * 0.04) : 0

  // On conserve l'algorithme historique pour ne pas déplacer brutalement le budget,
  // mais on expose explicitement son caractère estimatif/provisoire.
  const tefEstime = Math.round(tmb * 0.10)
  const depenseTotal = tmb + kcalSport + kcalPas + tefEstime
  const budgetJour = Math.max(1200, Math.round(depenseTotal - deficitCible))
  const kcalConsommees = Math.round(repas.filter(r => r.date === today).reduce((s, r) => s + asNumber(r.kcal), 0))
  const kcalRestantes = Math.max(0, budgetJour - kcalConsommees)

  const budget: DailyBudget = {
    tmb, kcalSport, kcalPas, kcalPasKnown, depenseTotal, deficitCible, budgetJour,
    kcalConsommees, kcalRestantes, surplusOuDeficit: kcalConsommees - budgetJour,
    tefEstime, budgetProvisoire: !kcalPasKnown,
  }

  // ── Poids / trajectoire ─────────────────────────────────────────────
  const weights = validWeights(poids)
  const latest = weights[weights.length - 1]
  const poidsActuel = latest?.valeur || 0
  const poidsObjectif = asNumber(objectifs?.poids_objectif, 70)
  const poidsDepart = asNumber(objectifs?.poids_depart, poidsActuel || 89.3)
  const kgPerdus = poidsActuel ? Math.max(0, poidsDepart - poidsActuel) : 0
  const kgRestants = poidsActuel ? Math.max(0, poidsActuel - poidsObjectif) : 0
  const progressionPct = poidsActuel && poidsDepart > poidsObjectif
    ? Math.max(0, Math.min(100, Math.round(((poidsDepart - poidsActuel) / (poidsDepart - poidsObjectif)) * 100)))
    : 0

  const trend7 = computeWeightTrend(weights, 7, today)
  const trend14 = computeWeightTrend(weights, 14, today)
  const trend30 = computeWeightTrend(weights, 30, today)
  const preferredTrend = trend30.confidence !== 'insuffisante' ? trend30 : trend14

  let dateEstimeeObjectif: Date | null = null
  let projectionStatus: ProgressionData['projectionStatus'] = 'insufficient_data'
  if (kgRestants <= 0 && poidsActuel > 0) {
    projectionStatus = 'goal_reached'
  } else if (preferredTrend.kgPerWeek !== null && preferredTrend.confidence !== 'insuffisante') {
    if (preferredTrend.kgPerWeek < -0.05) {
      const weeks = kgRestants / Math.abs(preferredTrend.kgPerWeek)
      if (Number.isFinite(weeks) && weeks > 0 && weeks < 260) {
        const etaKey = addDays(today, Math.round(weeks * 7))
        dateEstimeeObjectif = parseDateKey(etaKey)
        projectionStatus = 'on_track'
      }
    } else {
      projectionStatus = 'not_decreasing'
    }
  }

  const progression: ProgressionData = {
    poidsActuel, poidsObjectif, poidsDepart, kgPerdus, kgRestants, progressionPct,
    dateEstimeeObjectif,
    tendance7j: trend7.kgPerWeek,
    tendance14j: trend14.kgPerWeek,
    tendance30j: trend30.kgPerWeek,
    tendanceConfiance: preferredTrend.confidence,
    tendanceEchantillons: preferredTrend.samples,
    projectionStatus,
  }

  // ── Tendances nutrition ─────────────────────────────────────────────
  function getAverage(dates: string[], field: keyof MealEntry) {
    if (!dates.length) return 0
    const total = dates.reduce((sum, date) => sum + repas.filter(r => r.date === date).reduce((s, r) => s + asNumber(r[field]), 0), 0)
    return Math.round(total / dates.length)
  }
  function getBudgetForDate(date: string) {
    return asNumber(dailyBudgets.find(b => b.date === date)?.budget_jour, budgetJour)
  }
  function respected(dates: string[]) {
    return dates.filter(date => {
      const kcal = repas.filter(r => r.date === date).reduce((s, r) => s + asNumber(r.kcal), 0)
      return kcal > 0 && kcal <= getBudgetForDate(date)
    }).length
  }

  const dates7 = dateRangeMeals(repas, 7, today)
  const dates14 = dateRangeMeals(repas, 14, today)
  const dates30 = dateRangeMeals(repas, 30, today)
  const r7 = respected(dates7), r14 = respected(dates14), r30 = respected(dates30)
  const tendances: TendancesData = {
    moyKcal7j: getAverage(dates7, 'kcal'), moyKcal14j: getAverage(dates14, 'kcal'), moyKcal30j: getAverage(dates30, 'kcal'),
    moyProt7j: getAverage(dates7, 'proteines'), moyGluc7j: getAverage(dates7, 'glucides'), moyLip7j: getAverage(dates7, 'lipides'),
    joursRespectés7j: r7, joursRespectés14j: r14, joursRespectés30j: r30,
    pctRespect7j: dates7.length ? Math.round(r7 / dates7.length * 100) : 0,
    pctRespect14j: dates14.length ? Math.round(r14 / dates14.length * 100) : 0,
    pctRespect30j: dates30.length ? Math.round(r30 / dates30.length * 100) : 0,
    joursSuivis7j: dates7.length, joursSuivis14j: dates14.length, joursSuivis30j: dates30.length,
  }

  // ── Macros ──────────────────────────────────────────────────────────
  const weightForMacros = poidsActuel || asNumber(objectifs?.poids_depart, 83)
  const proteines = Math.round(weightForMacros * 2)
  const lipides = Math.round(budgetJour * 0.25 / 9)
  const glucides = Math.max(0, Math.round((budgetJour - proteines * 4 - lipides * 9) / 4))
  const macros = { proteines, lipides, glucides }

  return {
    budget, progression, tendances, macros, today,
    quality: {
      stepsToday: kcalPasKnown ? 'available' : 'missing',
      nutrition7d: dates7.length >= 5 ? 'good' : dates7.length >= 2 ? 'partial' : 'insufficient',
      weightTrend: preferredTrend.confidence,
    }
  }
}
