import { computeHealthEngine } from '../../lib/healthEngine'

import { useState } from 'react'

export default function MetricsBar({ poids, repas, seances, objectifs, pas }) {
  const [showDetail, setShowDetail] = useState(false)
  const { budget, progression: prog, today } = computeHealthEngine({ poids, repas, seances, composition: [], objectifs, pas })
  const pasAujourdhui = pas?.find(p => p.date === today)
  console.log('MetricsBar - kcalPas:', budget.kcalPas, 'budgetJour:', budget.budgetJour, 'pas:', pas?.length)

  const seancesSemaine = seances?.filter(s => {
    const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length || 0

  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
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
      <div className="bg-white rounded-xl border border-gray-100 p-4 relative cursor-pointer" onClick={() => setShowDetail(!showDetail)}>
        <div className="flex justify-between items-start">
          <div className="text-xs text-gray-400 mb-1">Budget calorique</div>
          <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center">?</span>
        </div>
        <div className={`text-2xl font-medium ${budget.surplusOuDeficit > 0 ? 'text-red-500' : 'text-green-600'}`}>
          {budget.surplusOuDeficit > 0 ? '+' : ''}{budget.surplusOuDeficit}
        </div>
        <div className="text-xs text-gray-400 mt-1">kcal · budget {budget.budgetJour} kcal</div>
        {showDetail && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl p-4 shadow-lg z-10 text-xs text-gray-600">
            <div className="font-medium text-gray-700 mb-2">📊 Calcul du budget</div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>TMB</span><span>+{budget.tmb} kcal</span></div>
              <div className="flex justify-between"><span>Effet thermique (~10%)</span><span>+{Math.round(budget.tmb * 0.1)} kcal</span></div>
              <div className="flex justify-between"><span>👟 Pas ({(pasAujourdhui?.nb_pas || 0).toLocaleString('fr-FR')})</span><span>+{budget.kcalPas} kcal</span></div>
              <div className="flex justify-between"><span>🏋️ Sport</span><span>+{budget.kcalSport} kcal</span></div>
              <div className="border-t border-gray-100 pt-1 mt-1 flex justify-between font-medium text-gray-700"><span>Dépense totale</span><span>{budget.depenseTotal} kcal</span></div>
              <div className="flex justify-between text-red-500"><span>Déficit cible</span><span>-{budget.deficitCible} kcal</span></div>
              <div className="border-t border-gray-100 pt-1 mt-1 flex justify-between font-medium text-blue-700"><span>Budget du jour</span><span>{budget.budgetJour} kcal</span></div>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Séances cette semaine</div>
        <div className="text-2xl font-medium">{seancesSemaine}</div>
        <div className="text-xs text-gray-400 mt-1">/ 4 objectif</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Pas aujourd'hui</div>
        <div className="text-2xl font-medium">{(pasAujourdhui?.nb_pas || 0).toLocaleString('fr-FR')}</div>
        <div className="text-xs text-gray-400 mt-1">objectif {(objectifs?.objectif_pas || 10000).toLocaleString('fr-FR')}</div>
      </div>
    </div>
  )
}