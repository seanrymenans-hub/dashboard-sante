'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const FOOD_DB = {
  'riz': { kcal: 130, p: 2.7, c: 28, f: 0.3 },
  'poulet': { kcal: 165, p: 31, c: 0, f: 3.6 },
  'oeuf': { kcal: 155, p: 13, c: 1.1, f: 11 },
  'flocons avoine': { kcal: 389, p: 17, c: 66, f: 7 },
  'banane': { kcal: 89, p: 1.1, c: 23, f: 0.3 },
  'pomme': { kcal: 52, p: 0.3, c: 14, f: 0.2 },
  'amandes': { kcal: 579, p: 21, c: 22, f: 50 },
  'saumon': { kcal: 208, p: 20, c: 0, f: 13 },
  'thon': { kcal: 144, p: 30, c: 0, f: 2 },
  'lentilles': { kcal: 116, p: 9, c: 20, f: 0.4 },
  'pain complet': { kcal: 247, p: 9, c: 41, f: 4 },
  'pates': { kcal: 131, p: 5, c: 25, f: 1.1 },
  'quinoa': { kcal: 120, p: 4.4, c: 22, f: 1.9 },
  'yaourt': { kcal: 61, p: 3.5, c: 4.7, f: 3.3 },
}

export default function Nutrition({ repas, onRefresh }) {
  const [nom, setNom] = useState('')
  const [qty, setQty] = useState(100)
  const [type, setType] = useState('dejeuner')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const today = new Date().toISOString().split('T')[0]
  const repasAujourdhui = repas?.filter(r => r.date === today) || []
  const totalKcal = repasAujourdhui.reduce((s, r) => s + r.kcal, 0)
  const totalP = repasAujourdhui.reduce((s, r) => s + (r.proteines || 0), 0)
  const totalC = repasAujourdhui.reduce((s, r) => s + (r.glucides || 0), 0)
  const totalF = repasAujourdhui.reduce((s, r) => s + (r.lipides || 0), 0)

  function onInput(val) {
    setNom(val)
    const matches = Object.keys(FOOD_DB).filter(k => k.includes(val.toLowerCase())).slice(0, 4)
    setSuggestions(val.length > 1 ? matches : [])
  }

  async function ajouterRepas() {
    if (!nom) return
    setLoading(true)
    const key = Object.keys(FOOD_DB).find(k => nom.toLowerCase().includes(k))
    const base = key ? FOOD_DB[key] : { kcal: 100, p: 5, c: 10, f: 3 }
    const factor = qty / 100
    await supabase.from('repas').insert({
      date: today,
      type,
      nom,
      kcal: Math.round(base.kcal * factor),
      proteines: Math.round(base.p * factor * 10) / 10,
      glucides: Math.round(base.c * factor * 10) / 10,
      lipides: Math.round(base.f * factor * 10) / 10,
    })
    setNom('')
    setQty(100)
    setSuggestions([])
    setLoading(false)
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Nutrition aujourd'hui</div>
          <div className="text-xs text-gray-400">{totalKcal} / 2 000 kcal</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[['Protéines', totalP, 150, '#378ADD'], ['Glucides', totalC, 250, '#EF9F27'], ['Lipides', totalF, 67, '#1D9E75']].map(([label, val, obj, color]) => (
          <div key={label}>
            <div className="text-xs text-gray-400">{label}</div>
            <div className="text-sm font-medium">{Math.round(val)} g</div>
            <div className="h-1.5 bg-gray-100 rounded mt-1">
              <div className="h-1.5 rounded transition-all" style={{ width: Math.min(100, Math.round(val / obj * 100)) + '%', background: color }} />
            </div>
            <div className="text-xs text-gray-300 mt-1">obj. {obj} g</div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-50 pt-4 mb-4">
        {repasAujourdhui.map(r => (
          <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <div>
              <span className="text-sm">{r.nom}</span>
              <span className="text-xs text-gray-400 ml-2">{r.type}</span>
            </div>
            <span className="text-sm font-medium">{r.kcal} kcal</span>
          </div>
        ))}
        {repasAujourdhui.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-4">Aucun repas enregistré aujourd'hui</div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Aliment..."
            value={nom}
            onChange={e => onInput(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 z-10">
              {suggestions.map(s => (
                <div key={s} className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={() => { setNom(s); setSuggestions([]) }}>
                  {s} — {FOOD_DB[s].kcal} kcal/100g
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          type="number"
          className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
        />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={type}
          onChange={e => setType(e.target.value)}
        >
          <option value="petit-dejeuner">Petit-déj</option>
          <option value="dejeuner">Déjeuner</option>
          <option value="collation">Collation</option>
          <option value="diner">Dîner</option>
        </select>
        <button
          onClick={ajouterRepas}
          disabled={loading}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm"
        >
          {loading ? '...' : '+'}
        </button>
      </div>
    </div>
  )
}