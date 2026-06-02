'use client'
import { useState } from 'react'
import NutritionAujourdhui from './NutritionAujourdhui'
import NutritionSuggestions from './NutritionSuggestions'
import Hydratation from './Hydratation'
import NutritionAnalyse from './NutritionAnalyse'
import PlanRepas from './PlanRepas'

const TABS = [
  { id: 'aujourdhui', label: "Aujourd'hui", emoji: '🍎' },
  { id: 'suggestions', label: 'Suggestions', emoji: '🤖' },
  { id: 'plan', label: 'Plan semaine', emoji: '📅' },
  { id: 'hydratation', label: 'Hydratation', emoji: '💧' },
  { id: 'analyse', label: 'Analyse', emoji: '📈' },
]

export default function NutritionLayout({ repas, objectifs, composition, poids, seances, onRefresh }) {
  const [tab, setTab] = useState('aujourdhui')

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'aujourdhui' && (
        <NutritionAujourdhui repas={repas} objectifs={objectifs} seances={seances} onRefresh={onRefresh} />
      )}
      {tab === 'suggestions' && (
        <NutritionSuggestions repas={repas} objectifs={objectifs} composition={composition} poids={poids} />
      )}
      {tab === 'plan' && (
        <PlanRepas objectifs={objectifs} poids={poids} composition={composition} />
      )}
      {tab === 'hydratation' && (
        <Hydratation poids={poids} />
      )}
      {tab === 'analyse' && (
        <NutritionAnalyse repas={repas} objectifs={objectifs} seances={seances} poids={poids} composition={composition} />
      )}
    </div>
  )
}