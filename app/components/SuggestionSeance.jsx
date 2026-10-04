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

  const intensiteStyle = {
    'légère': { bg: '#d4f5ec', text: '#0f6e56' },
    'modérée': { bg: '#faeeda', text: '#854f0b' },
    'intense': { bg: '#ffe4dc', text: '#e2553f' },
  }
  const ti = intensiteStyle[suggestion?.intensite] || { bg: '#f9f6f3', text: '#8a807a' }

  return (
    <div className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden mb-[22px]">
      <div className="flex items-center justify-between px-7 py-5">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
          <div>
            <div className="text-[15px] font-extrabold">Suggestion IA — prochaine séance</div>
            <div className="text-xs opacity-70 mt-0.5">Basé sur ton historique et ton bilan du jour</div>
          </div>
        </div>
      </div>

      <div className="px-7 pb-7">
        {!suggestion && !loading && (
          <div className="text-center py-5">
            <div className="text-sm opacity-70 mb-4">
              Clique pour générer une séance adaptée à ton état du jour
            </div>
            <button
              onClick={genererSuggestion}
              className="border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all"
            >
              Générer ma séance ✨
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-5 text-sm opacity-70">
            Analyse de tes données en cours...
          </div>
        )}

        {erreur && (
          <div className="text-center py-3 text-sm" style={{ color: '#ffb4a3' }}>{erreur}</div>
        )}

        {suggestion && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[17px] font-extrabold">{suggestion.titre}</div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: ti.bg, color: ti.text }}>
                {suggestion.intensite}
              </span>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{suggestion.duree} min</span>
              {suggestion.distance && <span className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{suggestion.distance} km</span>}
              {suggestion.allure && <span className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{suggestion.allure}</span>}
              {suggestion.groupesCibles?.map(g => (
                <span key={g} className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{g}</span>
              ))}
            </div>

            <div className="text-sm leading-relaxed mb-4 p-4 bg-white/[0.08] rounded-2xl font-medium opacity-95">
              {suggestion.raison}
            </div>

            {suggestion.exercices && suggestion.exercices.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold opacity-70 mb-2 tracking-wide">PROGRAMME</div>
                <div className="bg-white/[0.08] rounded-2xl overflow-hidden">
                  {suggestion.exercices.map((ex, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-white/10 last:border-0">
                      <span className="text-sm font-medium">{ex.nom}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-bold">{ex.series}</span>
                        {ex.repos && <span className="text-xs opacity-60">· repos {ex.repos}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={genererSuggestion}
              className="text-xs opacity-70 underline"
            >
              Regénérer une suggestion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}