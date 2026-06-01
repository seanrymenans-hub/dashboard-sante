'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Parametres({ onClose, onSave }) {
  const [poids, setPoidsObj] = useState(70)
  const [poidsDepart, setPoidsDepart] = useState(83.2)
  const [age, setAge] = useState(25)
  const [taille, setTaille] = useState(175)
  const [sexe, setSexe] = useState('homme')
  const [kcalObj, setKcalObj] = useState(1875)
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('objectifs').select('*').limit(1).single()
      if (data) {
        setPoidsObj(data.poids_objectif)
        setPoidsDepart(data.poids_depart)
        setAge(data.age || 30)
        setTaille(data.taille || 175)
        setSexe(data.sexe || 'homme')
        setKcalObj(data.kcal_journalier)
      }
    }
    fetch()
  }, [])

  async function sauvegarder() {
    setLoading(true)
    const tmb = sexe === 'homme'
      ? 88.36 + (13.4 * poidsDepart) + (4.8 * taille) - (5.7 * age)
      : 447.6 + (9.2 * poidsDepart) + (3.1 * taille) - (4.3 * age)

    const { data: existing } = await supabase.from('objectifs').select('id').limit(1).single()
    if (existing) {
      await supabase.from('objectifs').update({
        poids_objectif: poids,
        poids_depart: poidsDepart,
        kcal_journalier: kcalObj,
        age,
        taille,
        sexe,
        tmb: Math.round(tmb)
      }).eq('id', existing.id)
    } else {
      await supabase.from('objectifs').insert({
        poids_objectif: poids,
        poids_depart: poidsDepart,
        kcal_journalier: kcalObj,
        age,
        taille,
        sexe,
        tmb: Math.round(tmb)
      })
    }
    setLoading(false)
    setSucces(true)
    setTimeout(() => { setSucces(false); onSave(); onClose() }, 1500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="font-medium text-lg">Mes paramètres</div>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Sexe</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={sexe} onChange={e => setSexe(e.target.value)}>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Âge</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={age} onChange={e => setAge(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Taille (cm)</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={taille} onChange={e => setTaille(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Poids de départ (kg)</label>
              <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={poidsDepart} onChange={e => setPoidsDepart(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Objectif (kg)</label>
              <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={poids} onChange={e => setPoidsObj(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Objectif calorique journalier</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={kcalObj} onChange={e => setKcalObj(Number(e.target.value))} />
          </div>
        </div>

        <button
          onClick={sauvegarder}
          disabled={loading}
          className={`w-full mt-6 rounded-lg py-2.5 text-sm font-medium transition-all ${succes ? 'bg-green-500 text-white' : 'bg-black text-white'}`}
        >
          {loading ? 'Sauvegarde...' : succes ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}