'use client'
import { useState } from 'react'
import { computeHealthEngine } from '../../lib/healthEngine'

export default function CoachIA({ poids, repas, seances, composition, objectifs }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function generer() {
    setLoading(true)
    setErreur(null)
    const { budget, progression, tendances } = computeHealthEngine({ poids, repas, seances, composition, objectifs })
    try {
      const res = await fetch('/api/coach-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poids, repas, seances, composition, objectifs, budget, progression, tendances })
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
    <section className="h-full rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] p-[26px_28px] text-white flex flex-col overflow-hidden relative">
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[15px] flex-none">✦</span>
        <span className="text-sm font-extrabold tracking-wide">COACH IA</span>
      </div>

      {!data && !loading && (
        <div className="flex-1 relative flex flex-col">
          <p className="text-[15px] leading-relaxed opacity-90 mb-4 max-w-[420px]">
            Ton coach peut analyser toutes tes données pour te donner un bilan personnalisé de ta semaine.
          </p>
          <button
            onClick={generer}
            className="self-start border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl transition-all"
          >
            Voir mon bilan ✨
          </button>
          <span className="pointer-events-none select-none absolute -right-4 -bottom-6 text-[160px] leading-none opacity-[0.06]">✦</span>
        </div>
      )}

      {loading && (
        <p className="text-[15px] opacity-80">Ton coach analyse ta semaine...</p>
      )}

      {erreur && (
        <p className="text-[15px] text-red-300">{erreur}</p>
      )}

      {data && (
        <div>
          <p className="m-0 text-base leading-relaxed font-medium">{data.bilan}</p>

          {data.positifs?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold opacity-80 mb-2 tracking-wide">CE QUI VA BIEN</div>
              {data.positifs.map((p, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="text-[#7be8b5] text-sm mt-0.5">✓</span>
                  <span className="text-sm opacity-90">{p}</span>
                </div>
              ))}
            </div>
          )}

          {data.conseils?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold opacity-80 mb-2 tracking-wide">POUR ALLER PLUS VITE</div>
              {data.conseils.map((c, i) => (
                <div key={i} className="bg-white/[0.08] rounded-xl p-3 mb-2">
                  <div className="text-sm font-bold mb-1">{c.titre}</div>
                  <div className="text-xs opacity-80 leading-relaxed">{c.detail}</div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={generer}
            className="mt-4 border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl transition-all"
          >
            Regénérer le bilan
          </button>
        </div>
      )}
    </section>
  )
}
