import { computeHealthEngine } from '../../lib/healthEngine'

export default function MetricsBar({ poids, repas, seances, objectifs }) {
  const { budget, progression: prog } = computeHealthEngine({ poids, repas, seances, composition: [], objectifs })

  const seancesSemaine = seances?.filter(s => {
    const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length || 0

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Poids actuel</div>
        <div className="text-2xl font-medium">{prog.poidsActuel} kg</div>
        <div className="text-xs text-green-600 mt-1">objectif {prog.poidsObjectif} kg</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Progression</div>
        <div className="text-2xl font-medium">{prog.progressionPct}%</div>
        <div className="text-xs text-gray-400 mt-1">{prog.kgPerdus.toFixed(1)} kg perdus</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Budget calorique</div>
        <div className={`text-2xl font-medium ${budget.surplusOuDeficit > 0 ? 'text-red-500' : 'text-green-600'}`}>
          {budget.surplusOuDeficit > 0 ? '+' : ''}{budget.surplusOuDeficit}
        </div>
        <div className="text-xs text-gray-400 mt-1">kcal · budget {budget.budgetJour} kcal</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Séances cette semaine</div>
        <div className="text-2xl font-medium">{seancesSemaine}</div>
        <div className="text-xs text-gray-400 mt-1">/ 4 objectif</div>
      </div>
    </div>
  )
}