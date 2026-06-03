'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from './components/Navigation'
import WithingsSync from './components/WithingsSync'
import MetricsBar from './components/MetricsBar'
import GraphiquePoids from './components/GraphiquePoids'
import Composition from './components/Composition'
import Sport from './components/Sport'
import SuggestionSeance from './components/SuggestionSeance'
import CoachIA from './components/CoachIA'
import Streak from './components/Streak'
import Parametres from './components/Parametres'
import NutritionLayout from './components/NutritionLayout'
import { computeHealthEngine } from '../lib/healthEngine'

export default function Home() {
  const [poids, setPoids] = useState<any[]>([])
  const [repas, setRepas] = useState<any[]>([])
  const [seances, setSeances] = useState<any[]>([])
  const [objectifs, setObjectifs] = useState<any>(null)
  const [composition, setComposition] = useState<any[]>([])
  const [pas, setPas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showParametres, setShowParametres] = useState(false)
  const [onglet, setOnglet] = useState('accueil')
  const [planSemaine, setPlanSemaine] = useState<any>(null)
  const [showBudgetDetail, setShowBudgetDetail] = useState(false)

  const fetchData = useCallback(async () => {
    const [p, r, s, o, c, pa] = await Promise.all([
      supabase.from('poids').select('*').order('date', { ascending: false }),
      supabase.from('repas').select('*').order('date', { ascending: false }),
      supabase.from('seances').select('*').order('date', { ascending: false }),
      supabase.from('objectifs').select('*').limit(1).single(),
      supabase.from('composition').select('*').order('date', { ascending: false }),
      supabase.from('pas').select('*').order('date', { ascending: false }),
    ])
    setPoids(p.data || [])
    setRepas(r.data || [])
    setSeances(s.data || [])
    setObjectifs(o.data || null)
    setComposition(c.data || [])
    setPas(pa.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Chargement...</div>
    </div>
  )

  const engine = computeHealthEngine({ poids, repas, seances, composition, objectifs, pas })
  const { budget, progression: prog, tendances, today } = engine

  const pasAujourdhui = pas.find(p => p.date === today)
  const kcalAujourdhui = budget.kcalConsommees
  const kcalObj = budget.budgetJour

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium">Dashboard santé</h1>
            <p className="text-sm text-gray-400 mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => setShowParametres(true)} className="text-sm border border-gray-200 rounded-lg px-4 py-2 bg-white hover:bg-gray-50">
            ⚙️ Paramètres
          </button>
        </div>

        <Navigation ongletActif={onglet} setOnglet={setOnglet} />

        {onglet === 'accueil' && (
          <div>
            <MetricsBar poids={poids} repas={repas} seances={seances} objectifs={objectifs} pas={pas} />

            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
              <div className="font-medium mb-4">Progression vers l'objectif</div>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Poids · {prog.poidsDepart} → {prog.poidsObjectif} kg</span>
                  <span className="font-medium">{prog.progressionPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 bg-green-500 rounded transition-all" style={{ width: prog.progressionPct + '%' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {prog.kgPerdus.toFixed(1)} kg perdus · {prog.kgRestants.toFixed(1)} kg restants
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <button
                    onClick={() => setShowBudgetDetail(!showBudgetDetail)}
                    className="text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1"
                  >
                    Calories aujourd'hui <span className="text-xs">ℹ️</span>
                  </button>
                  <span className="font-medium">{kcalAujourdhui} / {kcalObj} kcal</span>
                </div>
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 bg-blue-400 rounded transition-all" style={{ width: Math.min(100, Math.round(kcalAujourdhui / kcalObj * 100)) + '%' }} />
                </div>

                {showBudgetDetail && (
                  <div className="mt-3 bg-blue-50 rounded-xl p-4 text-xs text-gray-600">
                    <div className="font-medium text-gray-700 mb-2">📊 Calcul du budget calorique</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>TMB (métabolisme de base)</span>
                        <span className="font-medium">+{budget.tmb} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Effet thermique (digestion ~10%)</span>
                        <span className="font-medium">+{Math.round(budget.tmb * 0.1)} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>👟 Pas ({(pasAujourdhui?.nb_pas || 0).toLocaleString('fr-FR')} pas)</span>
                        <span className="font-medium">+{budget.kcalPas} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🏋️ Sport du jour</span>
                        <span className="font-medium">+{budget.kcalSport} kcal</span>
                      </div>
                      <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between font-medium text-gray-700">
                        <span>Dépense totale</span>
                        <span>{budget.depenseTotal} kcal</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>Déficit cible</span>
                        <span>-{budget.deficitCible} kcal</span>
                      </div>
                      <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between font-medium text-blue-700">
                        <span>Budget du jour</span>
                        <span>{budget.budgetJour} kcal</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              

              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                🔮 À ce rythme, objectif atteint vers le <strong className="text-gray-800">{prog.dateEstimeeObjectif?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) || 'Objectif atteint !'}</strong>
              </div>
            </div>

            <Streak repas={repas} objectifs={objectifs} />
            <CoachIA poids={poids} repas={repas} seances={seances} composition={composition} objectifs={objectifs} />
          </div>
        )}

        {onglet === 'corps' && (
          <div>
            <WithingsSync onRefresh={fetchData} syncPasOnly={false} />
            <Composition composition={composition} onRefresh={fetchData} />
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
          />
        )}

        {onglet === 'sport' && (
          <div>
            <SuggestionSeance seances={seances} repas={repas} poids={poids} objectifs={objectifs} composition={composition} />
            <WithingsSync onRefresh={fetchData} syncPasOnly={true} />
            <Sport seances={seances} onRefresh={fetchData} poids={poids} pas={pas} />
          </div>
        )}

        {showParametres && (
          <Parametres
            onClose={() => setShowParametres(false)}
            onSave={fetchData}
          />
        )}
      </div>
    </main>
  )
}