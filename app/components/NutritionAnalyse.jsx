'use client'
import GraphiqueCalories from './GraphiqueCalories'
import GraphiqueMacros from './GraphiqueMacros'
import MacrosIA from './MacrosIA'

export default function NutritionAnalyse({ repas, objectifs, seances, poids, composition, onMacrosUpdate }) {

  const kcalObj = objectifs?.kcal_journalier || 1850

  const last7 = [...new Set(
    repas.filter(r => (new Date() - new Date(r.date)) / (1000 * 60 * 60 * 24) <= 7).map(r => r.date)
  )]

  const last30 = [...new Set(
    repas.filter(r => (new Date() - new Date(r.date)) / (1000 * 60 * 60 * 24) <= 30).map(r => r.date)
  )]

  const jourRespectés7 = last7.filter(date => {
    const kcal = repas.filter(r => r.date === date).reduce((s, r) => s + r.kcal, 0)
    return kcal <= kcalObj && kcal > 0
  }).length

  const jourRespectés30 = last30.filter(date => {
    const kcal = repas.filter(r => r.date === date).reduce((s, r) => s + r.kcal, 0)
    return kcal <= kcalObj && kcal > 0
  }).length

  const moyKcal7 = last7.length > 0
    ? Math.round(last7.reduce((s, date) => s + repas.filter(r => r.date === date).reduce((ss, r) => ss + r.kcal, 0), 0) / last7.length)
    : 0

  const moyProt7 = last7.length > 0
    ? Math.round(last7.reduce((s, date) => s + repas.filter(r => r.date === date).reduce((ss, r) => ss + (r.proteines || 0), 0), 0) / last7.length)
    : 0

  const pct7 = last7.length > 0 ? Math.round(jourRespectés7 / last7.length * 100) : 0
  const pct30 = last30.length > 0 ? Math.round(jourRespectés30 / last30.length * 100) : 0

  const couleurPct = (pct) => pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const couleurTexte = (pct) => pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex flex-col gap-4">

      {/* Objectifs IA */}
      <MacrosIA
        poids={poids}
        seances={seances}
        repas={repas}
        composition={composition}
        objectifs={objectifs}
        onMacrosUpdate={onMacrosUpdate}
      />

      {/* Respect des objectifs */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="font-medium mb-4">Respect des objectifs</div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { label: '7 derniers jours', pct: pct7, jours: `${jourRespectés7}/${last7.length}` },
            { label: '30 derniers jours', pct: pct30, jours: `${jourRespectés30}/${last30.length}` },
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