'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Hydratation({ poids }) {
  const [ml, setMl] = useState(0)
  const [quantiteManuelle, setQuantiteManuelle] = useState('')
  const [loading, setLoading] = useState(false)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const poidsKg = poids?.[0]?.valeur || 82
  const objectifMl = Math.round(poidsKg * 35)
  const progression = Math.min(100, Math.round(ml / objectifMl * 100))
  const litresBus = (ml / 1000).toFixed(1)
  const litresObjectif = (objectifMl / 1000).toFixed(1)

  const boutons = [
    { label: '☕', sublabel: 'Expresso', ml: 150 },
    { label: '🥛', sublabel: 'Verre', ml: 250 },
    { label: '🥤', sublabel: 'Canette', ml: 330 },
    { label: '💧', sublabel: 'Bouteille', ml: 500 },
    { label: '🫙', sublabel: 'Grande', ml: 1000 },
  ]

  useEffect(() => { fetchHydratation() }, [])

  async function fetchHydratation() {
    const { data } = await supabase.from('hydratation').select('*').eq('date', today).maybeSingle()
    if (data) setMl(data.verres)
  }

  async function ajouter(quantite) {
    setLoading(true)
    const newMl = ml + quantite
    await supabase.from('hydratation').upsert(
      { date: today, verres: newMl },
      { onConflict: 'date' }
    )
    setMl(newMl)
    setQuantiteManuelle('')
    setLoading(false)
  }

  async function reset() {
    await supabase.from('hydratation').upsert({ date: today, verres: 0 }, { onConflict: 'date' })
    setMl(0)
  }

  const getMessage = () => {
    if (progression === 0) return "Commence ta journée avec un grand verre d'eau 💧"
    if (progression < 25) return 'Bon début, continue !'
    if (progression < 50) return 'Tu es sur la bonne voie 👍'
    if (progression < 75) return 'Plus que la moitié !'
    if (progression < 100) return 'Encore un peu 💪'
    return '🎉 Objectif atteint !'
  }

  const couleurBarre = progression >= 100 ? 'bg-green-400' : 'bg-blue-400'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="font-medium">Hydratation</div>
          <div className="text-xs text-gray-400 mt-1">{getMessage()}</div>
        </div>
        <button onClick={reset} className="text-xs text-gray-300 hover:text-gray-500">
          Reset
        </button>
      </div>

      {/* Visuel bouteille + stats */}
      <div className="flex items-center gap-6 mb-6">
        {/* Bouteille */}
        <div className="relative flex-shrink-0" style={{ width: 60, height: 100 }}>
          <svg width="60" height="100" viewBox="0 0 60 100">
            {/* Corps bouteille */}
            <rect x="8" y="20" width="44" height="72" rx="8" fill="none" stroke="#e5e7eb" strokeWidth="2" />
            {/* Bouchon */}
            <rect x="20" y="10" width="20" height="12" rx="3" fill="#e5e7eb" />
            {/* Eau */}
            <clipPath id="bottle-clip">
              <rect x="8" y="20" width="44" height="72" rx="8" />
            </clipPath>
            <rect
              x="8"
              y={20 + 72 * (1 - progression / 100)}
              width="44"
              height={72 * progression / 100}
              fill={progression >= 100 ? '#4ade80' : '#60a5fa'}
              clipPath="url(#bottle-clip)"
              style={{ transition: 'all 0.6s ease' }}
            />
            {/* % */}
            <text x="30" y="62" textAnchor="middle" fontSize="11" fontWeight="500" fill={progression > 50 ? 'white' : '#6b7280'}>
              {progression}%
            </text>
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1">
          <div className="mb-3">
            <span className="text-3xl font-bold text-gray-800">{litresBus}</span>
            <span className="text-sm text-gray-400 ml-1">L</span>
            <div className="text-xs text-gray-400 mt-1">sur {litresObjectif}L objectif</div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${couleurBarre} rounded-full transition-all duration-500`}
              style={{ width: `${progression}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>0L</span>
            <span>{litresObjectif}L</span>
          </div>
        </div>
      </div>

      {/* Boutons rapides */}
      <div className="flex gap-2 mb-4">
        {boutons.map(b => (
          <button
            key={b.ml}
            onClick={() => ajouter(b.ml)}
            disabled={loading}
            className="flex-1 flex flex-col items-center gap-1 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-all disabled:opacity-40"
          >
            <span className="text-lg">{b.label}</span>
            <span className="text-xs text-gray-500">{b.sublabel}</span>
            <span className="text-xs font-medium text-blue-600">+{b.ml}ml</span>
          </button>
        ))}
      </div>

      {/* Saisie manuelle */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Quantité personnalisée (ml)"
          value={quantiteManuelle}
          onChange={e => setQuantiteManuelle(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => quantiteManuelle && ajouter(Number(quantiteManuelle))}
          disabled={!quantiteManuelle || loading}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40"
        >
          + Ajouter
        </button>
      </div>
    </div>
  )
}