'use client'
import { useMemo, useState } from 'react'

function daysAgo(date) {
  return (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000
}

export default function SuggestionSeance({ seances, repas, poids, objectifs, composition }) {
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  const contexte = useMemo(() => {
    const recent = (seances || []).filter(s => daysAgo(s.date) >= 0 && daysAgo(s.date) < 7)
    const last = [...(seances || [])].sort((a,b) => b.date.localeCompare(a.date))[0]
    const nbCourse = recent.filter(s => s.type === 'course').length
    const nbRenfo = recent.filter(s => s.type === 'renforcement').length
    const totalMin = recent.reduce((sum, s) => sum + (Number(s.duree) || 0), 0)
    const joursDepuisDerniere = last ? Math.max(0, Math.floor(daysAgo(last.date))) : null
    const signal = recent.length === 0
      ? 'Aucune séance récente enregistrée'
      : nbRenfo === 0 && recent.length > 0
        ? 'Renforcement absent cette semaine'
        : joursDepuisDerniere !== null && joursDepuisDerniere >= 4
          ? `${joursDepuisDerniere} jours depuis ta dernière séance`
          : totalMin >= 200
            ? 'Volume hebdo déjà conséquent'
            : 'Charge récente modérée'
    return {
      lastLabel: last ? `${last.nom} · ${joursDepuisDerniere}j` : 'Aucune séance récente',
      nbCourse, nbRenfo, totalMin, signal
    }
  }, [seances])

  async function genererSuggestion() {
    setLoading(true); setErreur(null)
    try {
      const res = await fetch('/api/suggestion-seance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seances, repas, poids, objectifs, composition })
      })
      const data = await res.json()
      if (data.suggestion) setSuggestion(data.suggestion)
      else setErreur('Impossible de générer une suggestion')
    } catch { setErreur('Erreur de connexion') }
    setLoading(false)
  }

  const intensiteStyle = {
    'légère': { bg: '#d4f5ec', text: '#0f6e56' },
    'modérée': { bg: '#faeeda', text: '#854f0b' },
    'intense': { bg: '#ffe4dc', text: '#e2553f' },
  }
  const ti = intensiteStyle[suggestion?.intensite] || { bg: '#f9f6f3', text: '#8a807a' }

  return (
    <div className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden">
      <div className="px-7 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
            <div>
              <div className="text-[15px] font-extrabold">Prochaine séance</div>
              <div className="text-xs opacity-65 mt-0.5">L’IA intervient uniquement quand tu lui demandes une proposition.</div>
            </div>
          </div>
          {!suggestion && !loading && (
            <button onClick={genererSuggestion} className="bg-white/[0.13] hover:bg-white/20 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all">Me proposer ma prochaine séance ✨</button>
          )}
        </div>

        {!suggestion && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl bg-white/[0.08] px-3.5 py-2.5"><div className="text-[10px] opacity-55 uppercase tracking-wide font-bold">Dernière séance</div><div className="text-xs font-bold mt-1">{contexte.lastLabel}</div></div>
            <div className="rounded-xl bg-white/[0.08] px-3.5 py-2.5"><div className="text-[10px] opacity-55 uppercase tracking-wide font-bold">Cette semaine</div><div className="text-xs font-bold mt-1">{contexte.nbCourse} course · {contexte.nbRenfo} renfo · {contexte.totalMin} min</div></div>
            <div className="rounded-xl bg-white/[0.08] px-3.5 py-2.5"><div className="text-[10px] opacity-55 uppercase tracking-wide font-bold">Signal</div><div className="text-xs font-bold mt-1">{contexte.signal}</div></div>
          </div>
        )}

        {loading && <div className="text-center py-6 text-sm opacity-70">Analyse de ton historique et de ta charge récente…</div>}
        {erreur && <div className="mt-4 text-sm text-[#ffb4a3]">{erreur}</div>}

        {suggestion && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="text-[18px] font-extrabold">{suggestion.titre}</div>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: ti.bg, color: ti.text }}>{suggestion.intensite}</span>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{suggestion.duree} min</span>
              {suggestion.distance && <span className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{suggestion.distance} km</span>}
              {suggestion.allure && <span className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{suggestion.allure}</span>}
              {suggestion.groupesCibles?.map(g => <span key={g} className="text-xs font-semibold bg-white/[0.12] px-3 py-1.5 rounded-full">{g}</span>)}
            </div>
            <div className="text-sm leading-relaxed mb-4 p-4 bg-white/[0.08] rounded-2xl font-medium opacity-95">{suggestion.raison}</div>
            {suggestion.exercices?.length > 0 && <div className="bg-white/[0.08] rounded-2xl overflow-hidden mb-4">{suggestion.exercices.map((ex, i) => <div key={i} className="flex justify-between items-center gap-3 px-4 py-3 border-b border-white/10 last:border-0"><span className="text-sm font-medium">{ex.nom}</span><span className="text-xs font-bold text-right">{ex.series}{ex.repos ? ` · repos ${ex.repos}` : ''}</span></div>)}</div>}
            <button onClick={genererSuggestion} className="text-xs opacity-70 underline">Regénérer une suggestion</button>
          </div>
        )}
      </div>
    </div>
  )
}
