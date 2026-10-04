import { computeHealthEngine } from '../../lib/healthEngine'

import { useState } from 'react'

export default function MetricsBar({ poids, repas, seances, objectifs, pas }) {
  const [showDetail, setShowDetail] = useState(false)
  const { budget, today } = computeHealthEngine({ poids, repas, seances, composition: [], objectifs, pas })
  const pasAujourdhui = pas?.find(p => p.date === today)
  const nbPas = pasAujourdhui?.nb_pas || 0

  // % consommé pour l'anneau conique (kcal consommées / budget du jour)
  const pctConsomme = budget.budgetJour > 0
    ? Math.min(100, Math.round((budget.kcalConsommees / budget.budgetJour) * 100))
    : 0

  return (
    <section
      className="relative rounded-[26px] bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] p-[30px_32px] text-white shadow-[0_20px_40px_-18px_rgba(255,107,74,0.65)] flex gap-8 items-center cursor-pointer"
      onClick={() => setShowDetail(!showDetail)}
    >
  
      <div className="relative w-28 h-28 md:w-40 md:h-40 flex-none flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(rgba(255,255,255,0.95) 0% ${pctConsomme}%, rgba(255,255,255,0.18) ${pctConsomme}% 100%)`,
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 10px))',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 10px))'
          }}
        />
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl md:text-4xl font-extrabold leading-none">{budget.kcalRestantes}</span>
          <span className="text-[11px] opacity-85 mt-1 tracking-wide">KCAL RESTANTES</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold opacity-90 tracking-wide">BUDGET CALORIQUE DU JOUR</div>
        <div className="text-[13px] mt-2 opacity-75 truncate">
          {budget.kcalConsommees} / {budget.budgetJour} kcal
          {budget.surplusOuDeficit > 0 && (
            <span className="ml-1">· +{budget.surplusOuDeficit}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-4">
          <div className="bg-white/20 rounded-xl px-2 py-2 text-center">
            <div className="text-[10px] opacity-80">TMB</div>
            <div className="text-sm font-extrabold mt-0.5 leading-tight">{budget.tmb}</div>
          </div>
          <div className="bg-white/20 rounded-xl px-2 py-2 text-center">
            <div className="text-[10px] opacity-80 truncate">👟 {nbPas.toLocaleString('fr-FR')}</div>
            <div className="text-sm font-extrabold mt-0.5 leading-tight">+{budget.kcalPas}</div>
          </div>
          <div className="bg-white/20 rounded-xl px-2 py-2 text-center">
            <div className="text-[10px] opacity-80">💪 Sport</div>
            <div className="text-sm font-extrabold mt-0.5 leading-tight">+{budget.kcalSport}</div>
          </div>
        </div>
      </div>

      {showDetail && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#f3eee9] rounded-xl p-4 shadow-lg z-10 text-xs text-gray-600 cursor-default"
        >
          <div className="font-medium text-[#2a1a12] mb-2">📊 Calcul du budget</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span>TMB</span><span>+{budget.tmb} kcal</span></div>
            <div className="flex justify-between"><span>Effet thermique (~10%)</span><span>+{Math.round(budget.tmb * 0.1)} kcal</span></div>
            <div className="flex justify-between"><span>👟 Pas ({nbPas.toLocaleString('fr-FR')})</span><span>+{budget.kcalPas} kcal</span></div>
            <div className="flex justify-between"><span>🏋️ Sport</span><span>+{budget.kcalSport} kcal</span></div>
            <div className="border-t border-gray-100 pt-1 mt-1 flex justify-between font-medium text-[#2a1a12]"><span>Dépense totale</span><span>{budget.depenseTotal} kcal</span></div>
            <div className="flex justify-between text-red-500"><span>Déficit cible</span><span>-{budget.deficitCible} kcal</span></div>
            <div className="border-t border-gray-100 pt-1 mt-1 flex justify-between font-medium text-[#ff6b4a]"><span>Budget du jour</span><span>{budget.budgetJour} kcal</span></div>
          </div>
        </div>
      )}
    </section>
  )
}
