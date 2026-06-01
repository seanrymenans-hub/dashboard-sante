'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Composition({ composition, onRefresh }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [masseGrasse, setMasseGrasse] = useState('')
  const [masseMusculaire, setMasseMusculaire] = useState('')
  const [masseHydrique, setMasseHydrique] = useState('')
  const [graisseViscerale, setGraisseViscerale] = useState('')
  const [masseMaigre, setMasseMaigre] = useState('')
  const [masseOsseuse, setMasseOsseuse] = useState('')
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const derniere = composition?.sort((a, b) => new Date(b.date) - new Date(a.date))?.[0]

  async function ajouter() {
    setLoading(true)
    await supabase.from('composition').insert({
      date,
      masse_grasse: masseGrasse ? parseFloat(masseGrasse) : 0,
      masse_musculaire: masseMusculaire ? parseFloat(masseMusculaire) : 0,
      masse_hydrique: masseHydrique ? parseFloat(masseHydrique) : 0,
      graisse_viscerale: graisseViscerale ? parseFloat(graisseViscerale) : 0,
      masse_maigre: masseMaigre ? parseFloat(masseMaigre) : 0,
      masse_osseuse: masseOsseuse ? parseFloat(masseOsseuse) : 0,
    })
    setLoading(false)
    setSucces(true)
    setShowForm(false)
    setTimeout(() => setSucces(false), 2000)
    onRefresh()
  }

  const metrics = [
    { label: 'Masse grasse', val: derniere?.masse_grasse, unit: 'kg', color: '#EF9F27', prev: composition?.[1]?.masse_grasse },
    { label: 'Masse musculaire', val: derniere?.masse_musculaire, unit: 'kg', color: '#1D9E75', prev: composition?.[1]?.masse_musculaire },
    { label: 'Masse hydrique', val: derniere?.masse_hydrique, unit: 'kg', color: '#378ADD', prev: composition?.[1]?.masse_hydrique },
    { label: 'Graisse viscérale', val: derniere?.graisse_viscerale, unit: '', color: '#D85A30', prev: composition?.[1]?.graisse_viscerale },
    { label: 'Masse maigre', val: derniere?.masse_maigre, unit: 'kg', color: '#534AB7', prev: composition?.[1]?.masse_maigre },
    { label: 'Masse osseuse', val: derniere?.masse_osseuse, unit: 'kg', color: '#888780', prev: composition?.[1]?.masse_osseuse },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Composition corporelle</div>
          <div className="text-xs text-gray-400">
            {derniere ? `Dernière mesure : ${new Date(derniere.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Aucune mesure encore'}
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`text-sm px-4 py-1.5 rounded-lg border transition-all ${succes ? 'bg-green-500 text-white border-green-500' : 'border-gray-200'}`}
        >
          {succes ? '✓ Ajouté !' : showForm ? 'Annuler' : '+ Mesure'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {metrics.map(m => {
          const diff = m.val && m.prev ? (parseFloat(m.val) - parseFloat(m.prev)).toFixed(1) : null
          return (
            <div key={m.label} className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">{m.label}</div>
              <div className="text-lg font-medium" style={{ color: m.val ? m.color : '#ccc' }}>
                {m.val ? `${m.val} ${m.unit}` : '—'}
              </div>
              {diff && (
                <div className={`text-xs mt-1 ${parseFloat(diff) <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {parseFloat(diff) > 0 ? '+' : ''}{diff} {m.unit}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="border-t border-gray-50 pt-4">
          <div className="flex justify-end mb-3">
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              ['Masse grasse (kg)', masseGrasse, setMasseGrasse],
              ['Masse musculaire (kg)', masseMusculaire, setMasseMusculaire],
              ['Masse hydrique (kg)', masseHydrique, setMasseHydrique],
              ['Graisse viscérale', graisseViscerale, setGraisseViscerale],
              ['Masse maigre (kg)', masseMaigre, setMasseMaigre],
              ['Masse osseuse (kg)', masseOsseuse, setMasseOsseuse],
            ].map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="0.0"
                  value={val}
                  onChange={e => setter(e.target.value)}
                />
              </div>
            ))}
          </div>
          <button
            onClick={ajouter}
            disabled={loading}
            className="w-full bg-black text-white rounded-lg py-2 text-sm"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer la mesure'}
          </button>
        </div>
      )}
    </div>
  )
}