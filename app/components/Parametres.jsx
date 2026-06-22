'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import RecalculerBudget from './RecalculerBudget'
import ExportDonnees from './ExportDonnees'

export default function Parametres({ onClose, onSave, poids, composition, repas, seances, pas, dailyBudgets, objectifs: objectifsProps }) {
  const [poidsCible, setPoidsObj] = useState(70)
  const [poidsDepart, setPoidsDepart] = useState(83.2)
  const [age, setAge] = useState(25)
  const [taille, setTaille] = useState(175)
  const [sexe, setSexe] = useState('homme')
  const [kcalObj, setKcalObj] = useState(1875)
  const [proteines, setProteines] = useState(150)
  const [glucides, setGlucides] = useState(180)
  const [lipides, setLipides] = useState(55)
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('objectifs').select('*').limit(1).single()
      if (data) {
        setPoidsObj(data.poids_objectif)
        setPoidsDepart(data.poids_depart)
        setAge(data.age || 25)
        setTaille(data.taille || 175)
        setSexe(data.sexe || 'homme')
        setKcalObj(data.kcal_journalier)
        setProteines(data.proteines_objectif || 150)
        setGlucides(data.glucides_objectif || 180)
        setLipides(data.lipides_objectif || 55)
      }
    }
    fetch()
  }, [])

  async function sauvegarder() {
    setLoading(true)
    const tmb = sexe === 'homme'
      ? Math.round(88.36 + (13.4 * poidsDepart) + (4.8 * taille) - (5.7 * age))
      : Math.round(447.6 + (9.2 * poidsDepart) + (3.1 * taille) - (4.3 * age))

    const { data: existing } = await supabase.from('objectifs').select('id').limit(1).single()
    const payload = {
      poids_objectif: poidsCible,
      poids_depart: poidsDepart,
      kcal_journalier: kcalObj,
      proteines_objectif: proteines,
      glucides_objectif: glucides,
      lipides_objectif: lipides,
      age, taille, sexe, tmb
    }
    if (existing) {
      await supabase.from('objectifs').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('objectifs').insert(payload)
    }
    setLoading(false)
    setSucces(true)
    setTimeout(() => { setSucces(false); onSave(); onClose() }, 1500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
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
              <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={poidsCible} onChange={e => setPoidsObj(Number(e.target.value))} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Macros nutritionnelles</div>
            <div className="text-xs text-blue-500 bg-blue-50 rounded-lg p-2 mb-3">
              ⚡ Calculées automatiquement selon ton poids et ton budget calorique du jour
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-blue-400 mb-1">Protéines</div>
                <div className="text-lg font-bold text-blue-600">~{Math.round((poidsDepart || 83) * 2)}g</div>
                <div className="text-xs text-gray-400 mt-1">2g/kg · fixe</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-amber-400 mb-1">Glucides</div>
                <div className="text-lg font-bold text-amber-600">variable</div>
                <div className="text-xs text-gray-400 mt-1">selon budget</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-green-400 mb-1">Lipides</div>
                <div className="text-lg font-bold text-green-600">25%</div>
                <div className="text-xs text-gray-400 mt-1">du budget</div>
              </div>
            </div>
          </div>

          {/* Maintenance */}
          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Maintenance</div>
            <RecalculerBudget />
          </div>

          {/* Export données */}
          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Export des données</div>
            <ExportDonnees
              poids={poids}
              composition={composition}
              repas={repas}
              seances={seances}
              pas={pas}
              dailyBudgets={dailyBudgets}
              objectifs={objectifsProps}
            />
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