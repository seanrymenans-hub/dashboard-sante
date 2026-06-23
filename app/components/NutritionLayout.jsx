'use client'
import { useState } from 'react'
import NutritionAujourdhui from './NutritionAujourdhui'
import NutritionSuggestions from './NutritionSuggestions'
import Hydratation from './Hydratation'
import NutritionAnalyse from './NutritionAnalyse'
import PlanRepas from './PlanRepas'

const TABS = [
  {
    id: 'aujourdhui',
    label: "Aujourd'hui",
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
    ),
  },
  {
    id: 'suggestions',
    label: 'Suggestions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18"><path d="M9 1.5l1.8 4.4 4.7.4-3.6 3 1.1 4.7L9 11.6l-4 2.4 1.1-4.7-3.6-3 4.7-.4z" fill="currentColor" /></svg>
    ),
  },
  {
    id: 'plan',
    label: 'Plan semaine',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18"><rect x="2" y="3" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M2 7h14M6 1.5v3M12 1.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
    ),
  },
  {
    id: 'hydratation',
    label: 'Hydratation',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18"><path d="M9 1.5C9 1.5 3.5 8 3.5 11.5a5.5 5.5 0 0011 0C14.5 8 9 1.5 9 1.5z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
    ),
  },
  {
    id: 'analyse',
    label: 'Analyse',
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18"><path d="M2 14V9M7 14V5M12 14V8M16 14V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    ),
  },
]

export default function NutritionLayout({ repas, objectifs, composition, poids, seances, onRefresh, planSemaine, onPlanUpdate, dailyBudgets, budgetJour = 0, budget, macros, tendances }) {
  const [tab, setTab] = useState('aujourdhui')

  return (
    <div>
      <div className="mb-[22px]">
        <div className="text-[13px] font-bold text-[#c2876b] tracking-wide uppercase">Nutrition</div>
        <h1 className="mt-1 text-[28px] font-extrabold text-[#2a1a12] tracking-tight">
          Ce que tu manges
        </h1>
      </div>

      <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 mb-[22px] shadow-[0_8px_18px_-14px_rgba(0,0,0,0.18)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] md:text-[13px] font-bold transition-all min-w-0 ${
              tab === t.id
                ? 'bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white shadow-[0_8px_18px_-8px_rgba(255,107,74,0.6)]'
                : 'text-[#8a807a] hover:bg-[#fff3ea] hover:text-[#2a1a12]'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'aujourdhui' && (
        <NutritionAujourdhui repas={repas} objectifs={objectifs} seances={seances} onRefresh={onRefresh} dailyBudgets={dailyBudgets} budgetJour={budgetJour} budget={budget} macros={macros} />
      )}
      {tab === 'suggestions' && (
        <NutritionSuggestions repas={repas} objectifs={objectifs} composition={composition} poids={poids} macros={macros} budget={budget} />
      )}
      {tab === 'plan' && (
        <PlanRepas objectifs={objectifs} poids={poids} composition={composition} planCache={planSemaine} onPlanUpdate={onPlanUpdate} macros={macros} />
      )}
      {tab === 'hydratation' && (
        <Hydratation poids={poids} />
      )}
      {tab === 'analyse' && (
        <NutritionAnalyse repas={repas} objectifs={objectifs} seances={seances} poids={poids} composition={composition} macros={macros} budget={budget} tendances={tendances} dailyBudgets={dailyBudgets} />
      )}
    </div>
  )
}