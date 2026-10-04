// ============================================
// HEALTH ENGINE — Couche centrale de calcul
// Tous les composants consomment ce moteur
// ============================================

export interface HealthData {
  poids: any[]
  repas: any[]
  seances: any[]
  composition: any[]
  objectifs: any
  pas?: any[]
  hydratation?: any[]
  dailyBudgets?: any[] // historique table daily_budget, pour comparer chaque jour à son propre budget
}

export interface DailyBudget {
  tmb: number
  kcalSport: number
  kcalPas: number
  depenseTotal: number
  deficitCible: number
  budgetJour: number
  kcalConsommees: number
  kcalRestantes: number
  surplusOuDeficit: number
}

export interface MacrosObjectif {
  proteines: number
  lipides: number
  glucides: number
}

export interface ProgressionData {
  poidsActuel: number
  poidsObjectif: number
  poidsDepart: number
  kgPerdus: number
  kgRestants: number
  progressionPct: number
  dateEstimeeObjectif: Date | null
  tendance7j: number // kg/semaine
}

export interface CompositionData {
  masseGrasse: number
  masseGrassePct: number
  masseMusculaire: number
  masseMusculairePct: number
  masseHydrique: number
  masseHydriquePct: number
  masseMaigre: number
  masseOsseuse: number
  evolutionHier: Record<string, number>
  evolution7j: Record<string, number>
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
}

export interface HealthEngineOutput {
  budget: DailyBudget
  progression: ProgressionData
  tendances: TendancesData
  macros: MacrosObjectif
  today: string
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

export function computeHealthEngine(data: HealthData): HealthEngineOutput {
  const { poids, repas, seances, composition, objectifs, pas = [], hydratation = [], dailyBudgets = [] } = data
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // ---- BUDGET JOURNALIER ----
  const tmb = objectifs?.tmb || 1875
  const deficitCible = objectifs?.deficit_cible || 750

  const kcalSport = seances
    ?.filter(s => s.date === today)
    ?.reduce((s: number, r: any) => s + (r.kcal || 0), 0) || 0

  const pasAujourdhui = pas?.find(p => p.date === today)
  const nbPas = pasAujourdhui?.nb_pas || 0
  const pasDesCourses = seances
    ?.filter(s => s.date === today && s.type === 'course')
    ?.reduce((sum, s) => sum + Math.round((parseFloat(s.distance) || 0) * 1280), 0) || 0
  const nbPasHorsCourse = Math.max(0, nbPas - pasDesCourses)
  const kcalPas = Math.round(nbPasHorsCourse * 0.04)

  const tef = Math.round(tmb * 0.10)
  const depenseTotal = tmb + kcalSport + kcalPas + tef
  const budgetJour = Math.max(1200, depenseTotal - deficitCible)

  const kcalConsommees = repas
    ?.filter(r => r.date === today)
    ?.reduce((s: number, r: any) => s + (r.kcal || 0), 0) || 0

  const kcalRestantes = Math.max(0, budgetJour - kcalConsommees)
  const surplusOuDeficit = kcalConsommees - budgetJour

  const budget: DailyBudget = {
    tmb, kcalSport, kcalPas, depenseTotal,
    deficitCible, budgetJour,
    kcalConsommees, kcalRestantes, surplusOuDeficit
  }

  // ---- PROGRESSION POIDS ----
  const poidsActuel = poids?.[0]?.valeur || 0
  const poidsObjectif = objectifs?.poids_objectif || 70
  const poidsDepart = objectifs?.poids_depart || 89.3
  const kgPerdus = Math.max(0, poidsDepart - poidsActuel)
  const kgRestants = Math.max(0, poidsActuel - poidsObjectif)
  const progressionPct = poidsDepart > poidsObjectif
    ? Math.max(0, Math.round(((poidsDepart - poidsActuel) / (poidsDepart - poidsObjectif)) * 100))
    : 0

  // Tendance poids sur 7j
  const poids7j = poids?.filter(p => {
    const diff = (new Date().getTime() - new Date(p.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const tendance7j = poids7j?.length >= 2
    ? Number(((poids7j[0]?.valeur - poids7j[poids7j.length - 1]?.valeur) / (poids7j.length / 7)).toFixed(2))
    : 0

  // Date estimée objectif
  const vitesseSemaine = Math.abs(tendance7j) > 0 ? Math.abs(tendance7j) : 0.5
  const semainesRestantes = Math.ceil(kgRestants / vitesseSemaine)
  const dateEstimeeObjectif = new Date()
  dateEstimeeObjectif.setDate(dateEstimeeObjectif.getDate() + semainesRestantes * 7)

  const progression: ProgressionData = {
    poidsActuel, poidsObjectif, poidsDepart,
    kgPerdus, kgRestants, progressionPct,
    dateEstimeeObjectif: kgRestants > 0 ? dateEstimeeObjectif : null,
    tendance7j
  }

  // ---- TENDANCES NUTRITIONNELLES ----
  function getJoursDansPlage(jours: number) {
    return [...new Set(
      repas
        ?.filter(r => {
          const diff = (new Date().getTime() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24)
          return diff <= jours
        })
        ?.map(r => r.date) || []
    )] as string[]
  }

  function getMoyenne(dates: string[], field: string) {
    if (dates.length === 0) return 0
    const total = dates.reduce((s, date) => {
      return s + repas.filter(r => r.date === date).reduce((ss: number, r: any) => ss + (r[field] || 0), 0)
    }, 0)
    return Math.round(total / dates.length)
  }

  // Compare chaque jour à SON propre budget historique, pas à un chiffre fixe
  // ou au budget du jour courant. Fallback sur budgetJour uniquement si aucun
  // budget historique n'existe pour cette date (ex: données antérieures à la migration).
  function getBudgetDuJour(date: string): number {
    const entry = dailyBudgets?.find(b => b.date === date)
    return entry?.budget_jour || budgetJour
  }

  function getJoursRespectés(dates: string[]) {
    return dates.filter(date => {
      const kcal = repas.filter(r => r.date === date).reduce((s: number, r: any) => s + r.kcal, 0)
      const kcalObjJour = getBudgetDuJour(date)
      return kcal <= kcalObjJour && kcal > 0
    }).length
  }

  const dates7j = getJoursDansPlage(7)
  const dates14j = getJoursDansPlage(14)
  const dates30j = getJoursDansPlage(30)

  const joursRespectés7j = getJoursRespectés(dates7j)
  const joursRespectés14j = getJoursRespectés(dates14j)
  const joursRespectés30j = getJoursRespectés(dates30j)

  const tendances: TendancesData = {
    moyKcal7j: getMoyenne(dates7j, 'kcal'),
    moyKcal14j: getMoyenne(dates14j, 'kcal'),
    moyKcal30j: getMoyenne(dates30j, 'kcal'),
    moyProt7j: getMoyenne(dates7j, 'proteines'),
    moyGluc7j: getMoyenne(dates7j, 'glucides'),
    moyLip7j: getMoyenne(dates7j, 'lipides'),
    joursRespectés7j, joursRespectés14j, joursRespectés30j,
    pctRespect7j: dates7j.length > 0 ? Math.round(joursRespectés7j / dates7j.length * 100) : 0,
    pctRespect14j: dates14j.length > 0 ? Math.round(joursRespectés14j / dates14j.length * 100) : 0,
    pctRespect30j: dates30j.length > 0 ? Math.round(joursRespectés30j / dates30j.length * 100) : 0,
  }

// ---- MACROS OBJECTIF DYNAMIQUES ----
  const poidsActuelMacros = poids?.[0]?.valeur || 83
  const protObj = Math.round(poidsActuelMacros * 2) // 2g/kg
  const lipObj = Math.round(budgetJour * 0.25 / 9)  // 25% du budget en lipides
  const glucObj = Math.round((budgetJour - protObj * 4 - lipObj * 9) / 4) // reste en glucides

  const macros: MacrosObjectif = {
    proteines: protObj,
    lipides: lipObj,
    glucides: Math.max(0, glucObj)
  }
  
  return { budget, progression, tendances, macros, today }
}