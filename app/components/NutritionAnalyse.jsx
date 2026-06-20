'use client'
import { useState } from 'react'
import GraphiqueCalories from './GraphiqueCalories'
import GraphiqueMacros from './GraphiqueMacros'
export default function NutritionAnalyse({ repas, objectifs, seances, poids, composition, macros, budget, tendances }) {
  const [synthese, setSynthese] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)

  async function genererSynthese() {
    setLoadingIA(true)

    // Calculer le budget moyen sur 7 jours
    const budgetMoyen7j = Math.round(
      (budget.tmb + Math.round(budget.tmb * 0.1) - (objectifs?.deficit_cible || 750))
    )

    try {
      const res = await fetch('/api/analyse-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repas, objectifs, tendances, budgetMoyen7j })
      })
      const data = await res.json()
      if (data.bilan) setSynthese(data)
    } catch(e) { console.error(e) }
    setLoadingIA(false)
  }

  const kcalObj = budget.budgetJour

  const last14 = [...new Set(
    repas.filter(r => (new Date().getTime() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24) <= 14).map(r => r.date)
  )]

  const jourRespectés14 = last14.filter(date => {
    const kcal = repas.filter(r => r.date === date).reduce((s, r) => s + r.kcal, 0)
    return kcal <= kcalObj && kcal > 0
  }).length
  const pct14 = last14.length > 0 ? Math.round(jourRespectés14 / last14.length * 100) : 0

  const pct7 = tendances.pctRespect7j
  const pct30 = tendances.pctRespect30j
  const moyKcal7 = tendances.moyKcal7j
  const moyProt7 = tendances.moyProt7j

  const couleurPct = (pct) => pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const couleurTexte = (pct) => pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex flex-col gap-4">
      {/* Respect des objectifs */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="font-medium mb-4">Respect des objectifs</div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: '7 derniers jours', pct: pct7, jours: `${tendances.joursRespectés7j}/${tendances.pctRespect7j > 0 ? Math.round(tendances.joursRespectés7j / tendances.pctRespect7j * 100) : 0}` },
            { label: '14 derniers jours', pct: pct14, jours: `${jourRespectés14}/${last14.length}` },
            { label: '30 derniers jours', pct: pct30, jours: `${tendances.joursRespectés30j}/${tendances.pctRespect30j > 0 ? Math.round(tendances.joursRespectés30j / tendances.pctRespect30j * 100) : 0}` },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-2">{item.label}</div>
              <div className={`text-2xl font-bold mb-2 ${couleurTexte(item.pct)}`}>{item.pct}%</div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${couleurPct(item.pct)}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">{item.jours} jours respectés</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Moy. calories / jour (7j)', value: moyKcal7, unit: 'kcal', obj: kcalObj },
            { label: 'Moy. protéines / jour (7j)', value: moyProt7, unit: 'g', obj: macros?.proteines || 166 },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-2">{item.label}</div>
              <div className="text-2xl font-bold text-gray-800">
                {item.value} <span className="text-sm font-normal text-gray-400">{item.unit}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Objectif : {item.obj} {item.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <GraphiqueCalories repas={repas} seances={seances} objectifs={objectifs} />
      <GraphiqueMacros repas={repas} objectifs={objectifs} />

      {/* Synthèse IA */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
          <div>
            <div className="font-medium">Synthèse IA</div>
            <div className="text-xs text-gray-400 mt-1">Analyse personnalisée de tes habitudes nutritionnelles</div>
          </div>
          <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">IA</span>
        </div>
        <div className="px-6 py-4">
          {!synthese && (
            <div className="text-center py-4">
              <button
                onClick={genererSynthese}
                disabled={loadingIA}
                className="bg-black text-white rounded-lg px-6 py-2 text-sm disabled:opacity-40"
              >
                {loadingIA ? 'Analyse en cours...' : 'Générer ma synthèse ✨'}
              </button>
            </div>
          )}
          {synthese && (
            <div>
              <div className="bg-gray-50 rounded-xl p-4 mb-3">
                <div className="text-sm text-gray-700 leading-relaxed">{synthese.bilan}</div>
              </div>
              {synthese.positifs?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-green-600 mb-2">✓ Ce qui va bien</div>
                  {synthese.positifs.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <span className="text-green-500 text-sm">✓</span>
                      <span className="text-sm text-gray-600">{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {synthese.conseils?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-purple-600 mb-2">💡 Conseils</div>
                  {synthese.conseils.map((c, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-3 mb-2">
                      <div className="text-sm font-medium text-gray-800 mb-1">{c.titre}</div>
                      <div className="text-xs text-gray-500">{c.detail}</div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setSynthese(null)} className="text-xs text-gray-400 underline mt-2">
                Regénérer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}