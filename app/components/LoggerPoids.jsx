'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoggerPoids({ poids, onRefresh }) {
  const [valeur, setValeur] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)

  const dernierPoids = poids?.[0]?.valeur || null
  const avantDernierPoids = poids?.[1]?.valeur || null
  const diff = dernierPoids && avantDernierPoids
    ? (parseFloat(dernierPoids) - parseFloat(avantDernierPoids)).toFixed(1)
    : null

  async function ajouterPoids() {
    if (!valeur) return
    setLoading(true)
    await supabase.from('poids').insert({
      date,
      valeur: parseFloat(valeur)
    })
    setValeur('')
    setLoading(false)
    setSucces(true)
    setTimeout(() => setSucces(false), 2000)
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Pesée du jour</div>
          <div className="text-xs text-gray-400">Synchronisé avec ta courbe de poids</div>
        </div>
        {diff && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${parseFloat(diff) <= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {parseFloat(diff) <= 0 ? '▼' : '▲'} {Math.abs(diff)} kg depuis hier
          </span>
        )}
      </div>

      {dernierPoids && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Dernière pesée</div>
          <div className="text-xl font-medium">{dernierPoids} kg</div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(poids[0].date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          step="0.1"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Ex : 82.3"
          value={valeur}
          onChange={e => setValeur(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ajouterPoids()}
        />
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button
          onClick={ajouterPoids}
          disabled={loading || !valeur}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${succes ? 'bg-green-500 text-white' : 'bg-black text-white'} disabled:opacity-40`}
        >
          {loading ? '...' : succes ? '✓' : 'Ajouter'}
        </button>
      </div>
    </div>
  )
}