'use client'
import GraphiqueCalories from './GraphiqueCalories'
import GraphiqueMacros from './GraphiqueMacros'
import { computeHealthEngine } from '../../lib/healthEngine'
export default function NutritionAnalyse({ repas, objectifs, seances, poids, composition }) {

  const { tendances, budget } = computeHealthEngine({ poids, repas, seances, composition, objectifs })
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
            { label: 'Moy. protéines / jour (7j)', value: moyProt7, unit: 'g', obj: objectifs?.proteines_objectif || 150 },
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
    </div>
  )
}