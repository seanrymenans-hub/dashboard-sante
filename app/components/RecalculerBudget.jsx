'use client'
import { useState } from 'react'

// Outil de correction ponctuelle : permet de recalculer le budget d'un jour
// passé si la synchro des pas n'était pas arrivée au moment du premier
// chargement de la page ce jour-là (voir bug du 20/06).
export default function RecalculerBudget() {
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState(null)

  async function recalculer() {
    if (!date) return
    setLoading(true)
    setResultat(null)
    setErreur(null)
    try {
      const res = await fetch('/api/recalculer-budget-jour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setResultat(data)
    } catch (e) {
      setErreur(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl bg-[#f9f6f3] p-5">
      <div className="text-sm font-bold text-[#2a1a12] mb-1">Recalculer le budget d'un jour</div>
      <div className="text-xs text-[#8a807a] mb-4">
        Utile si un budget passé s'est figé avec 0 kcal de pas (synchro Apple Health pas encore arrivée ce jour-là).
      </div>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm bg-white"
        />
        <button
          onClick={recalculer}
          disabled={loading || !date}
          className="bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-40 flex-shrink-0"
        >
          {loading ? '...' : 'Recalculer'}
        </button>
      </div>

      {resultat && (
        <div className="mt-4 bg-[#d4f5ec] rounded-xl p-4 text-sm">
          <div className="font-bold text-[#0f6e56] mb-1">✓ Budget du {resultat.date} recalculé</div>
          <div className="text-[#0f6e56] text-xs">
            Pas pris en compte : {resultat.avant.nbPas} pas → {resultat.avant.kcalPas} kcal · Nouveau budget : {resultat.budgetRecalcule.budgetJour} kcal
          </div>
        </div>
      )}
      {erreur && (
        <div className="mt-4 bg-[#ffe4dc] rounded-xl p-4 text-sm text-[#e2553f] font-medium">
          Erreur : {erreur}
        </div>
      )}
    </div>
  )
}