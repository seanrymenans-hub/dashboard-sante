'use client'
import { useState } from 'react'

export default function SuggestionSeance({ seances, repas, poids, objectifs, composition }) {
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function genererSuggestion() {
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch('/api/suggestion-seance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seances, repas, poids, objectifs, composition })
      })
      const data = await res.json()
      if (data.suggestion) setSuggestion(data.suggestion)
      else setErreur('Impossible de générer une suggestion')
    } catch {
      setErreur('Erreur de connexion')
    }
    setLoading(false)
  }

  const intensiteColor = {
    'légère': 'bg-green-50 text-green-700',
    'modérée': 'bg-amber-50 text-amber-700',
    'intense': 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Suggestion IA — prochaine séance</div>
          <div className="text-xs text-gray-400">Basé sur ton historique et ton bilan du jour</div>
        </div>
        <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
          IA
        </span>
      </div>

      {!suggestion && !loading && (
        <div className="text-center py-6">
          <div className="text-gray-400 text-sm mb-4">
            Clique pour générer une séance adaptée à ton état du jour
          </div>
          <button
            onClick={genererSuggestion}
            className="bg-black text-white rounded-lg px-6 py-2 text-sm"
          >
            Générer ma séance ✨
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-6 text-gray-400 text-sm">
          Analyse de tes données en cours...
        </div>
      )}

      {erreur && (
        <div className="text-center py-4 text-red-500 text-sm">{erreur}</div>
      )}

      {suggestion && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-lg">{suggestion.titre}</div>
            <span className={`text-xs px-3 py-1 rounded-full ${intensiteColor[suggestion.intensite] || 'bg-gray-50 text-gray-600'}`}>
              {suggestion.intensite}
            </span>
          </div>

          <div className="flex gap-3 mb-3 flex-wrap">
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{suggestion.duree} min</span>
            {suggestion.distance && <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{suggestion.distance} km</span>}
            {suggestion.allure && <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full">{suggestion.allure}</span>}
            {suggestion.groupesCibles?.map(g => (
              <span key={g} className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full">{g}</span>
            ))}
          </div>

          <div className="text-sm text-gray-600 leading-relaxed mb-4 p-4 bg-gray-50 rounded-xl">
            {suggestion.raison}
          </div>

          {suggestion.exercices && suggestion.exercices.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">Programme</div>
              {suggestion.exercices.map((ex, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm">{ex.nom}</span>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-600 font-medium">{ex.series}</span>
                    {ex.repos && <span className="text-xs text-gray-400">· repos {ex.repos}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={genererSuggestion}
            className="text-xs text-gray-400 underline"
          >
            Regénérer une suggestion
          </button>
        </div>
      )}
    </div>
  )
}