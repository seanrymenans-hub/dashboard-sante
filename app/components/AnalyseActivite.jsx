'use client'
import { useState, useMemo } from 'react'

const PERIODES = [
  { label: '7j', jours: 7 },
  { label: '1 mois', jours: 30 },
  { label: '3 mois', jours: 90 },
  { label: '6 mois', jours: 180 },
]

export default function AnalyseActivite({ seances, repas, objectifs, macros }) {
  const [periode, setPeriode] = useState(7)
  const [analyseIA, setAnalyseIA] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)

  // Toutes les séances de la période, peu importe le type (course, renforcement, autre)
  const seancesPeriode = useMemo(() => {
    return seances
      .filter(s => {
        const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
        return diff <= periode
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [seances, periode])

  const repartition = useMemo(() => {
    const parType = { course: 0, renforcement: 0, autre: 0 }
    seancesPeriode.forEach(s => {
      parType[s.type] = (parType[s.type] || 0) + 1
    })
    return parType
  }, [seancesPeriode])

  async function analyser() {
    setLoadingIA(true)
    try {
      const repasPeriode = repas.filter(r => {
        const diff = (new Date().getTime() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24)
        return diff <= periode
      })
      const res = await fetch('/api/analyse-activite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seances: seancesPeriode, repas: repasPeriode, objectifs, periode, macros })
      })
      const data = await res.json()
      if (data.analyse) setAnalyseIA(data)
    } catch (e) { console.error(e) }
    setLoadingIA(false)
  }

  return (
    <div className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden">
      <div className="flex justify-between items-center px-7 py-5">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
          <div>
            <div className="text-[15px] font-extrabold">Analyse IA de mon activité</div>
            <div className="text-xs opacity-70 mt-0.5">Basée sur tout ton sport et ton alimentation</div>
          </div>
        </div>
        <div className="flex gap-1 bg-white/[0.1] rounded-xl p-1">
          {PERIODES.map(p => (
            <button
              key={p.jours}
              onClick={() => { setPeriode(p.jours); setAnalyseIA(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periode === p.jours ? 'bg-white/20 text-white' : 'text-white/60'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-7 pb-7">
        {/* Répartition rapide par type — donne du contexte avant de demander l'analyse */}
        <div className="flex gap-2 mb-4">
          <span className="text-xs font-semibold bg-white/[0.1] px-3 py-1.5 rounded-full">🏃 {repartition.course || 0} course{repartition.course > 1 ? 's' : ''}</span>
          <span className="text-xs font-semibold bg-white/[0.1] px-3 py-1.5 rounded-full">💪 {repartition.renforcement || 0} renfo</span>
          <span className="text-xs font-semibold bg-white/[0.1] px-3 py-1.5 rounded-full">⚡ {repartition.autre || 0} autre{repartition.autre > 1 ? 's' : ''}</span>
        </div>

        {!analyseIA && !loadingIA && (
          <div className="text-center py-4">
            <button
              onClick={analyser}
              disabled={seancesPeriode.length === 0}
              className="border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all disabled:opacity-40"
            >
              Analyser mon activité ✨
            </button>
            {seancesPeriode.length === 0 && (
              <div className="text-xs opacity-60 mt-3">Aucune séance sur cette période</div>
            )}
          </div>
        )}

        {loadingIA && (
          <div className="text-center py-4 text-sm opacity-70">Analyse en cours...</div>
        )}

        {analyseIA && (
          <div>
            <div className="bg-white/[0.08] rounded-2xl p-4 mb-3 text-sm leading-relaxed font-medium">{analyseIA.analyse}</div>
            {analyseIA.points?.map((p, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className={`text-sm mt-0.5 ${p.positif ? 'text-[#7be8b5]' : 'text-[#ffc78a]'}`}>{p.positif ? '✓' : '→'}</span>
                <span className="text-sm opacity-90">{p.texte}</span>
              </div>
            ))}

            {analyseIA.semaineProchaine?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs font-bold opacity-70 mb-3 tracking-wide">PROPOSITION POUR LA SEMAINE PROCHAINE</div>
                <div className="flex flex-col gap-2">
                  {analyseIA.semaineProchaine.map((s, i) => (
                    <div key={i} className="bg-white/[0.08] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{s.activite}</div>
                        <div className="text-xs opacity-70 mt-0.5">{s.raison}</div>
                      </div>
                      {s.jour && (
                        <span className="text-xs font-bold bg-white/[0.12] px-2.5 py-1 rounded-full flex-shrink-0">{s.jour}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setAnalyseIA(null)} className="text-xs opacity-70 underline mt-3">Regénérer</button>
          </div>
        )}
      </div>
    </div>
  )
}