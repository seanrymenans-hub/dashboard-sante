'use client'
import { useState } from 'react'
import NutritionAujourdhui from './NutritionAujourdhui'
import NutritionSuggestions from './NutritionSuggestions'
import Hydratation from './Hydratation'
import NutritionAnalyse from './NutritionAnalyse'

const TABS = [
  { id: 'aujourdhui', label: "Aujourd'hui", emoji: '🍎' },
  { id: 'suggestions', label: 'Suggestions', emoji: '🤖' },
  { id: 'hydratation', label: 'Hydratation', emoji: '💧' },
  { id: 'analyse', label: 'Analyse', emoji: '📈' },
]

export default function NutritionLayout({ repas, objectifs, macrosIA, onMacrosUpdate, composition, poids, seances, onRefresh }) {
  const [tab, setTab] = useState('aujourdhui')

  const objectifsEffectifs = macrosIA ? {
    ...objectifs,
    kcal_journalier: macrosIA.kcal,
    proteines_objectif: macrosIA.proteines,
    glucides_objectif: macrosIA.glucides,
    lipides_objectif: macrosIA.lipides,
  } : objectifs

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
        <NutritionAujourdhui repas={repas} objectifs={objectifsEffectifs} onRefresh={onRefresh} />
      )}
      {tab === 'suggestions' && (
        <NutritionSuggestions repas={repas} objectifs={objectifsEffectifs} composition={composition} poids={poids} />
      )}
      {tab === 'hydratation' && (
        <Hydratation poids={poids} />
      )}
      {tab === 'analyse' && (
        <NutritionAnalyse repas={repas} objectifs={objectifsEffectifs} seances={seances} poids={poids} composition={composition} onMacrosUpdate={onMacrosUpdate} />
      )}
    </div>
  )
}