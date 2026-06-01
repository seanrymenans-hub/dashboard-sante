'use client'
import { useState } from 'react'

export default function SuggestionRepas({ repas, objectifs, composition, poids }) {
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function generer() {
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch('/api/suggestion-repas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repas, objectifs, composition, poids })
      })
      const data = await res.json()
      if (data.suggestions) setSuggestions(data.suggestions)
      else setErreur('Impossible de générer une suggestion')
    } catch {
      setErreur('Erreur de connexion')
    }
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const kcalMange = repas?.filter(r => r.date === today)?.reduce((s, r) => s + r.kcal, 0) || 0
  const kcalObj = objectifs?.kcal_journalier || 1850
  const kcalRestants = kcalObj - kcalMange

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Suggestion repas — IA</div>
          <div className="text-xs text-gray-400">
            {kcalRestants > 0 ? `${kcalRestants} kcal restantes aujourd'hui` : 'Objectif calorique atteint'}
          </div>
        </div>
        <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">IA</span>
      </div>

      {!suggestions && !loading && (
        <div className="text-center py-6">
          <div className="text-gray-400 text-sm mb-4">
            L'IA analyse tes macros du jour et ta composition corporelle pour te proposer le repas idéal
          </div>
          <button onClick={generer} className="bg-black text-white rounded-lg px-6 py-2 text-sm">
            Générer mes suggestions ✨
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-6 text-gray-400 text-sm">
          Analyse de ton bilan nutritionnel...
        </div>
      )}

      {erreur && (
        <div className="text-center py-4 text-red-500 text-sm">{erreur}</div>
      )}

      {suggestions && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {suggestions.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4">
                <div className="font-medium text-sm mb-1">{s.nom}</div>
                <div className="text-xs text-gray-400 mb-2">{s.description}</div>
                <div className="flex gap-3 mb-3 text-xs">
                  <span className="font-medium">{s.kcal} kcal</span>
                  <span className="text-blue-500">P {s.proteines}g</span>
                  <span className="text-amber-500">G {s.glucides}g</span>
                  <span className="text-green-500">L {s.lipides}g</span>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Ingrédients</div>
                  {s.ingredients?.map((ing, j) => (
                    <div key={j} className="text-xs text-gray-500">· {ing}</div>
                  ))}
                </div>
                <div className="text-xs text-purple-600 italic bg-purple-50 rounded-lg p-2">
                  {s.raison}
                </div>
              </div>
            ))}
          </div>
          <button onClick={generer} className="text-xs text-gray-400 underline">
            Regénérer d'autres suggestions
          </button>
        </div>
      )}
    </div>
  )
}