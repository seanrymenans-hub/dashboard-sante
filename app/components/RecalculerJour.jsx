'use client'
import { useState } from 'react'

export default function RecalculerJour() {
  const hier = new Date()
  hier.setDate(hier.getDate() - 1)
  const hierStr = `${hier.getFullYear()}-${String(hier.getMonth() + 1).padStart(2, '0')}-${String(hier.getDate()).padStart(2, '0')}`

  const [date, setDate] = useState(hierStr)
  const [nbPas, setNbPas] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState(null)

  async function recalculer() {
    setLoading(true)
    setResultat(null)
    setErreur(null)
    try {
      const body = { date }
      if (nbPas) body.nb_pas = parseInt(nbPas)

      const res = await fetch('/api/daily-budget/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) {
        setResultat(data)
      } else {
        setErreur(data.error || 'Erreur inconnue')
      }
    } catch (e) {
      setErreur(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Date à corriger</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={date}
            onChange={e => { setDate(e.target.value); setResultat(null); setErreur(null) }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Nb de pas (optionnel)</label>
          <input
            type="number"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="ex: 10737"
            value={nbPas}
            onChange={e => { setNbPas(e.target.value); setResultat(null); setErreur(null) }}
          />
        </div>
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
        💡 Le budget sera recalculé avec les pas indiqués + les séances de sport déjà loggées pour cette date.
      </div>

      <button
        onClick={recalculer}
        disabled={loading || !date}
        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100 disabled:opacity-40 transition-all"
      >
        {loading ? 'Calcul en cours...' : '🔧 Recalculer ce jour'}
      </button>

      {resultat && (
        <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
          <div className="font-bold mb-1">✅ {resultat.date} mis à jour</div>
          <div>Budget : {resultat.budgetJour} kcal</div>
          <div>Pas : {resultat.nbPas?.toLocaleString('fr-FR')} → {resultat.kcalPas} kcal</div>
          <div>Sport : {resultat.kcalSport} kcal</div>
        </div>
      )}

      {erreur && (
        <div className="bg-red-50 rounded-lg p-3 text-xs text-red-600">
          ❌ {erreur}
        </div>
      )}
    </div>
  )
}