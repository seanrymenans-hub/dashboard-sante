'use client'
import { useState } from 'react'

export default function CoachIA({ poids, repas, seances, composition, objectifs }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function generer() {
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch('/api/coach-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poids, repas, seances, composition, objectifs })
      })
      const result = await res.json()
      if (result.bilan) setData(result)
      else setErreur('Impossible de générer le bilan')
    } catch {
      setErreur('Erreur de connexion')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Coach IA</div>
          <div className="text-xs text-gray-400 mt-1">Bilan de la semaine + conseils personnalisés</div>
        </div>
        <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">IA</span>
      </div>

      {!data && !loading && (
        <div className="text-center py-6">
          <div className="text-sm text-gray-400 mb-4">
            Ton coach analyse toutes tes données pour te donner un bilan personnalisé
          </div>
          <button onClick={generer} className="bg-black text-white rounded-lg px-6 py-2 text-sm">
            Voir mon bilan ✨
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-6 text-sm text-gray-400">
          Ton coach analyse ta semaine...
        </div>
      )}

      {erreur && (
        <div className="text-center py-4 text-sm text-red-500">{erreur}</div>
      )}

      {data && (
        <div>
          {/* Bilan */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="text-sm text-gray-700 leading-relaxed">{data.bilan}</div>
          </div>

          {/* Points positifs */}
          {data.positifs?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-green-600 mb-2">✓ Ce qui va bien</div>
              {data.positifs.map((p, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="text-green-500 text-sm mt-0.5">✓</span>
                  <span className="text-sm text-gray-600">{p}</span>
                </div>
              ))}
            </div>
          )}

          {/* Conseils */}
          {data.conseils?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-purple-600 mb-2">💡 Pour aller plus vite</div>
              {data.conseils.map((c, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 mb-2">
                  <div className="text-sm font-medium text-gray-800 mb-1">{c.titre}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{c.detail}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={generer} className="text-xs text-gray-400 underline mt-2">
            Regénérer le bilan
          </button>
        </div>
      )}
    </div>
  )
}