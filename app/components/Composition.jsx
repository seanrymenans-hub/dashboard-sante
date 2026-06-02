'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import GraphiqueComposition from './GraphiqueComposition'

export default function Composition({ composition, onRefresh }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [masseGrasse, setMasseGrasse] = useState('')
  const [masseMusculaire, setMasseMusculaire] = useState('')
  const [masseHydrique, setMasseHydrique] = useState('')
  const [graisseViscerale, setGraisseViscerale] = useState('')
  const [masseMaigre, setMasseMaigre] = useState('')
  const [masseOsseuse, setMasseOsseuse] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingIA, setLoadingIA] = useState(false)
  const [analyseIA, setAnalyseIA] = useState(null)
  const [succes, setSucces] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showGraphique, setShowGraphique] = useState(false)

  const sorted = composition?.sort((a, b) => new Date(b.date) - new Date(a.date)) || []
  const derniere = sorted[0]
  const avant = sorted[1]

  // Mesure il y a 7 jours
  const mesure7j = sorted.find(c => {
    const diff = (new Date().getTime() - new Date(c.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 6 && diff <= 8
  }) || sorted[sorted.length - 1]

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

  async function analyserComposition() {
    setLoadingIA(true)
    try {
      const res = await fetch('/api/analyse-composition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composition: sorted.slice(0, 10) })
      })
      const data = await res.json()
      if (data.analyse) setAnalyseIA(data)
    } catch(e) { console.error(e) }
    setLoadingIA(false)
  }

  const metrics = [
    {
      label: 'Masse grasse', val: derniere?.masse_grasse, pct: derniere?.masse_grasse_pct,
      prev: avant?.masse_grasse, prev7j: mesure7j?.masse_grasse,
      color: '#EF9F27', positifSiDiminue: true
    },
    {
      label: 'Masse musculaire', val: derniere?.masse_musculaire, pct: derniere?.masse_musculaire_pct,
      prev: avant?.masse_musculaire, prev7j: mesure7j?.masse_musculaire,
      color: '#1D9E75', positifSiDiminue: false
    },
    {
      label: 'Masse hydrique', val: derniere?.masse_hydrique, pct: derniere?.masse_hydrique_pct,
      prev: avant?.masse_hydrique, prev7j: mesure7j?.masse_hydrique,
      color: '#378ADD', positifSiDiminue: false
    },
    {
      label: 'Masse maigre', val: derniere?.masse_maigre,
      prev: avant?.masse_maigre, prev7j: mesure7j?.masse_maigre,
      color: '#534AB7', positifSiDiminue: false
    },
    {
      label: 'Masse osseuse', val: derniere?.masse_osseuse,
      prev: avant?.masse_osseuse, prev7j: mesure7j?.masse_osseuse,
      color: '#888780', positifSiDiminue: false
    },
  ]

  function getIndicateur(diff, positifSiDiminue) {
    if (!diff || diff === 0) return null
    const estPositif = positifSiDiminue ? diff < 0 : diff > 0
    return estPositif ? '↑ positif' : '↓ attention'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Composition corporelle</div>
          <div className="text-xs text-gray-400">
            {derniere ? `Dernière mesure : ${new Date(derniere.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Aucune mesure encore'}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGraphique(!showGraphique)} className="text-sm border border-gray-200 rounded-lg px-4 py-1.5">
            {showGraphique ? 'Masquer' : '📈 Évolution'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`text-sm px-4 py-1.5 rounded-lg border transition-all ${succes ? 'bg-green-500 text-white border-green-500' : 'border-gray-200'}`}
          >
            {succes ? '✓ Ajouté !' : showForm ? 'Annuler' : '+ Mesure'}
          </button>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {metrics.map(m => {
          const diffHier = m.val && m.prev ? parseFloat((parseFloat(m.val) - parseFloat(m.prev)).toFixed(1)) : null
          const diff7j = m.val && m.prev7j ? parseFloat((parseFloat(m.val) - parseFloat(m.prev7j)).toFixed(1)) : null
          const indicateur = getIndicateur(diffHier, m.positifSiDiminue)

          return (
            <div key={m.label} className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">{m.label}</div>
              <div className="text-lg font-medium" style={{ color: m.val ? m.color : '#ccc' }}>
                {m.val ? `${m.val} kg` : '—'}
              </div>
              {m.pct && <div className="text-xs text-gray-400 mt-0.5">{m.pct}%</div>}

              {/* Évolution hier */}
              {diffHier !== null && (
                <div className={`text-xs mt-1 ${
                  (m.positifSiDiminue && diffHier < 0) || (!m.positifSiDiminue && diffHier > 0)
                    ? 'text-green-600' : diffHier === 0 ? 'text-gray-400' : 'text-red-500'
                }`}>
                  {diffHier > 0 ? '+' : ''}{diffHier} kg vs hier
                </div>
              )}

              {/* Évolution 7j */}
              {diff7j !== null && (
                <div className={`text-xs mt-0.5 ${
                  (m.positifSiDiminue && diff7j < 0) || (!m.positifSiDiminue && diff7j > 0)
                    ? 'text-green-600' : diff7j === 0 ? 'text-gray-400' : 'text-red-500'
                }`}>
                  {diff7j > 0 ? '+' : ''}{diff7j} kg sur 7j
                </div>
              )}

              {/* Indicateur */}
              {indicateur && (
                <div className={`text-xs mt-1 font-medium ${indicateur.includes('positif') ? 'text-green-600' : 'text-amber-500'}`}>
                  {indicateur}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Analyse IA */}
      <div className="border-t border-gray-50 pt-4 mb-4">
        {!analyseIA && (
          <button
            onClick={analyserComposition}
            disabled={loadingIA || !derniere}
            className="w-full border border-purple-200 bg-purple-50 text-purple-700 rounded-xl py-2 text-sm hover:bg-purple-100 transition-all disabled:opacity-40"
          >
            {loadingIA ? 'Analyse en cours...' : '🧠 Analyser ma composition IA'}
          </button>
        )}
        {analyseIA && (
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="text-xs font-medium text-purple-700 mb-2">🧠 Analyse IA</div>
            <div className="text-sm text-gray-700 leading-relaxed mb-2">{analyseIA.analyse}</div>
            {analyseIA.points?.map((p, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <span className={`text-xs mt-0.5 ${p.positif ? 'text-green-600' : 'text-amber-600'}`}>
                  {p.positif ? '✓' : '→'}
                </span>
                <span className="text-xs text-gray-600">{p.texte}</span>
              </div>
            ))}
            <button onClick={() => setAnalyseIA(null)} className="text-xs text-gray-400 underline mt-2">
              Fermer
            </button>
          </div>
        )}
      </div>

      {/* Graphique */}
      {showGraphique && (
        <div className="border-t border-gray-50 pt-4">
          <GraphiqueComposition composition={composition} />
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="border-t border-gray-50 pt-4">
          <div className="flex justify-end mb-3">
            <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={date} onChange={e => setDate(e.target.value)} />
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
                <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0.0" value={val} onChange={e => setter(e.target.value)} />
              </div>
            ))}
          </div>
          <button onClick={ajouter} disabled={loading} className="w-full bg-black text-white rounded-lg py-2 text-sm">
            {loading ? 'Enregistrement...' : 'Enregistrer la mesure'}
          </button>
        </div>
      )}
    </div>
  )
}