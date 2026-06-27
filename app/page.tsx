'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from './components/Navigation'
import WithingsSync from './components/WithingsSync'
import MetricsBar from './components/MetricsBar'
import GraphiquePoids from './components/GraphiquePoids'
import Composition from './components/Composition'
import Sport from './components/Sport'
import CourseAnalyse from './components/CourseAnalyse'
import AnalyseActivite from './components/AnalyseActivite'
import SuggestionSeance from './components/SuggestionSeance'
import CoachIA from './components/CoachIA'
import CartePoids from './components/CartePoids'
import MiniStats from './components/MiniStats'
import Streak from './components/Streak'
import Parametres from './components/Parametres'
import NutritionLayout from './components/NutritionLayout'
import { computeHealthEngine } from '../lib/healthEngine'
import CoachGlobal from './components/CoachGlobal'

function getTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function Home() {
  const [poids, setPoids] = useState<any[]>([])
  const [repas, setRepas] = useState<any[]>([])
  const [seances, setSeances] = useState<any[]>([])
  const [objectifs, setObjectifs] = useState<any>(null)
  const [composition, setComposition] = useState<any[]>([])
  const [pas, setPas] = useState<any[]>([])
  const [hydratation, setHydratation] = useState<any[]>([])
  const [dailyBudgets, setDailyBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showParametres, setShowParametres] = useState(false)
  const [onglet, setOnglet] = useState('accueil')
  const [planSemaine, setPlanSemaine] = useState<any>(null)
  const [coachSummary, setCoachSummary] = useState<any>(null)
  const [compositionAnalyse, setCompositionAnalyse] = useState<any>(null)

  const fetchData = useCallback(async () => {
    const today = getTodayStr()
    const [p, r, s, o, c, pa, hy, db, ds] = await Promise.all([
      supabase.from('poids').select('*').order('date', { ascending: false }),
      supabase.from('repas').select('*').order('date', { ascending: false }),
      supabase.from('seances').select('*').order('date', { ascending: false }),
      supabase.from('objectifs').select('*').limit(1).single(),
      supabase.from('composition').select('*').order('date', { ascending: false }),
      supabase.from('pas').select('*').order('date', { ascending: false }),
      supabase.from('hydratation').select('*').order('date', { ascending: false }),
      supabase.from('daily_budget').select('*').order('date', { ascending: false }),
      supabase.from('daily_summary').select('*').eq('date', today).maybeSingle(),
    ])
    setPoids(p.data || [])
    setRepas(r.data || [])
    setSeances(s.data || [])
    setObjectifs(o.data || null)
    setComposition(c.data || [])
    setPas(pa.data || [])
    setHydratation(hy.data || [])
    setDailyBudgets(db.data || [])
    if (ds.data?.summary) {
      const parsed = typeof ds.data.summary === 'string' ? JSON.parse(ds.data.summary) : ds.data.summary
      setCoachSummary(parsed)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const engine = computeHealthEngine({ poids, repas, seances, composition, objectifs, pas, dailyBudgets })
  const { budget, progression: prog, tendances, macros, today } = engine

  useEffect(() => {
    if (loading) return
    supabase.from('daily_budget').upsert(
      {
        date: today,
        budget_jour: budget.budgetJour,
        tmb: budget.tmb,
        kcal_pas: budget.kcalPas,
        kcal_sport: budget.kcalSport,
        tef: Math.round(budget.tmb * 0.1),
        deficit_cible: budget.deficitCible,
      },
      { onConflict: 'date' }
    )
  }, [loading, today, budget.budgetJour, budget.tmb, budget.kcalPas, budget.kcalSport, budget.deficitCible])

  const dejaVerifie = useRef(false)

  useEffect(() => {
    if (loading || dejaVerifie.current) return
    dejaVerifie.current = true

    const hierDate = new Date()
    hierDate.setDate(hierDate.getDate() - 1)
    const hierStr = `${hierDate.getFullYear()}-${String(hierDate.getMonth() + 1).padStart(2, '0')}-${String(hierDate.getDate()).padStart(2, '0')}`

    const budgetHier = dailyBudgets.find(b => b.date === hierStr)
    const pasHier = pas.find(p => p.date === hierStr)

    if (!budgetHier || !pasHier) return

    const nbPasReel = pasHier.nb_pas || 0
    const seancesHier = seances.filter(s => s.date === hierStr)
    const pasDesCoursesHier = seancesHier
      .filter(s => s.type === 'course')
      .reduce((sum, s) => sum + Math.round((parseFloat(s.distance) || 0) * 1280), 0)
    const kcalPasReel = Math.round(Math.max(0, nbPasReel - pasDesCoursesHier) * 0.04)

    const kcalSportHier = seancesHier.reduce((s, r) => s + (r.kcal || 0), 0)
    const pasMissing = (budgetHier.kcal_pas || 0) === 0 && kcalPasReel > 0
    const sportMissing = (budgetHier.kcal_sport || 0) === 0 && kcalSportHier > 0

    if (pasMissing || sportMissing) {
      const kcalPasCorrige = pasMissing ? kcalPasReel : (budgetHier.kcal_pas || 0)
      const kcalSportCorrige = sportMissing ? kcalSportHier : (budgetHier.kcal_sport || 0)
      const tefHier = budgetHier.tef || Math.round((budgetHier.tmb || budget.tmb) * 0.1)
      const depenseTotalHier = (budgetHier.tmb || budget.tmb) + kcalSportCorrige + kcalPasCorrige + tefHier
      const budgetJourHier = Math.max(1200, depenseTotalHier - (budgetHier.deficit_cible || budget.deficitCible))

      supabase.from('daily_budget').upsert(
        {
          date: hierStr,
          budget_jour: budgetJourHier,
          tmb: budgetHier.tmb,
          kcal_pas: kcalPasCorrige,
          kcal_sport: kcalSportCorrige,
          tef: tefHier,
          deficit_cible: budgetHier.deficit_cible || budget.deficitCible,
        },
        { onConflict: 'date' }
      )
    }
  }, [loading])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Chargement...</div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#fff3ea] to-[#ffeee0]">
      <Navigation ongletActif={onglet} setOnglet={setOnglet} onOpenParametres={() => setShowParametres(true)} userName="Sean" userPlan="Health Engine" />

      {/* padding-bottom sur mobile pour la barre de nav du bas */}
      <main className="flex-1 min-w-0 px-4 md:px-9 py-[30px] pb-24 md:pb-[30px]">
        {onglet === 'accueil' && (
          <header className="flex justify-between items-center mb-7">
            <div>
              <div className="text-[13px] font-bold text-[#c2876b] tracking-wide uppercase">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <h1 className="mt-1 text-[24px] md:text-[28px] font-extrabold text-[#2a1a12] tracking-tight">
                Salut Sean 👋
              </h1>
            </div>
          </header>
        )}

        {onglet === 'accueil' && (
          /* Sur mobile : colonne unique. Sur desktop : grille 2 colonnes */
          <div className="flex flex-col md:grid md:grid-cols-[1.55fr_1fr] gap-[22px] md:items-stretch">
            <div className="flex flex-col gap-[22px]">
              <MetricsBar poids={poids} repas={repas} seances={seances} objectifs={objectifs} pas={pas} />
              <div className="flex-1">
                <CoachIA poids={poids} repas={repas} seances={seances} composition={composition} objectifs={objectifs} />
              </div>
            </div>
            <div className="flex flex-col gap-[22px]">
              <CartePoids poids={poids} repas={repas} seances={seances} objectifs={objectifs} pas={pas} />
              <MiniStats seances={seances} pas={pas} objectifs={objectifs} />
              <Streak repas={repas} objectifs={objectifs} pas={pas} seances={seances} dailyBudgets={dailyBudgets} budget={budget} />
            </div>
          </div>
        )}

        {onglet === 'corps' && (
          <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-[22px]">
              <div>
                <div className="text-[13px] font-bold text-[#c2876b] tracking-wide uppercase">Composition corporelle</div>
                <h1 className="mt-1 text-[24px] md:text-[28px] font-extrabold text-[#2a1a12] tracking-tight">
                  Ton corps en détail
                </h1>
              </div>
              <WithingsSync onRefresh={fetchData} syncPasOnly={false} />
            </div>
            <Composition composition={composition} poids={poids} onRefresh={fetchData} analyseIA={compositionAnalyse} onAnalyseUpdate={setCompositionAnalyse} />
            <GraphiquePoids poids={poids} objectifs={objectifs} />
          </div>
        )}

        {onglet === 'nutrition' && (
          <NutritionLayout
            repas={repas}
            objectifs={objectifs}
            composition={composition}
            poids={poids}
            seances={seances}
            onRefresh={fetchData}
            planSemaine={planSemaine}
            onPlanUpdate={setPlanSemaine}
            dailyBudgets={dailyBudgets}
            budgetJour={budget.budgetJour}
            budget={budget}
            macros={macros}
            tendances={tendances}
          />
        )}

        {onglet === 'sport' && (
          <div className="flex flex-col gap-[22px]">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[13px] font-bold text-[#c2876b] tracking-wide uppercase">Activité</div>
                <h1 className="mt-1 text-[24px] md:text-[28px] font-extrabold text-[#2a1a12] tracking-tight">
                  Ton sport cette semaine
                </h1>
              </div>
              <WithingsSync onRefresh={fetchData} syncPasOnly={true} />
            </div>
            <SuggestionSeance seances={seances} repas={repas} poids={poids} objectifs={objectifs} composition={composition} />
            <Sport seances={seances} onRefresh={fetchData} poids={poids} pas={pas} budget={budget} />
            <CourseAnalyse seances={seances} repas={repas} objectifs={objectifs} macros={macros} onRefresh={fetchData} />
            <AnalyseActivite seances={seances} repas={repas} objectifs={objectifs} macros={macros} />
          </div>
        )}

        {onglet === 'coach' && (
          <CoachGlobal
            poids={poids}
            repas={repas}
            seances={seances}
            composition={composition}
            objectifs={objectifs}
            pas={pas}
            hydratation={hydratation}
            budget={budget}
            progression={prog}
            tendances={tendances}
            macros={macros}
            summaryCache={coachSummary}
            onSummaryUpdate={setCoachSummary}
          />
        )}

        {showParametres && (
          <Parametres
            onClose={() => setShowParametres(false)}
            onSave={fetchData}
            poids={poids}
            composition={composition}
            repas={repas}
            seances={seances}
            pas={pas}
            dailyBudgets={dailyBudgets}
            objectifs={objectifs}
          />
        )}
      </main>
    </div>
  )
}