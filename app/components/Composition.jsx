'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import GraphiqueComposition from './GraphiqueComposition'

export default function Composition({ composition, onRefresh, analyseIA, onAnalyseUpdate }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [masseGrasse, setMasseGrasse] = useState('')
  const [masseMusculaire, setMasseMusculaire] = useState('')
  const [masseHydrique, setMasseHydrique] = useState('')
  const [graisseViscerale, setGraisseViscerale] = useState('')
  const [masseMaigre, setMasseMaigre] = useState('')
  const [masseOsseuse, setMasseOsseuse] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingIA, setLoadingIA] = useState(false)
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
      if (data.analyse) onAnalyseUpdate?.(data)
    } catch(e) { console.error(e) }
    setLoadingIA(false)
  }

  function diffEt(val, prev) {
    if (!val || !prev) return null
    return parseFloat((parseFloat(val) - parseFloat(prev)).toFixed(1))
  }

  // Texte narratif pour les 2 métriques clés (gras/muscle) — explique le sens de l'évolution
  // Priorité au delta sur 7j (plus fiable, moins de bruit de mesure jour-à-jour),
  // fallback sur le delta "vs hier" seulement si la mesure 7j n'est pas encore disponible.
  function texteNarratif(diffHier, diff7j, positifSiDiminue) {
    const diff = diff7j !== null ? diff7j : diffHier
    const periode = diff7j !== null ? 'sur 7j' : 'vs hier'
    if (diff === null) return null
    if (diff === 0) return { texte: `Stable ${periode}`, positif: null, hausse: false }
    const estPositif = positifSiDiminue ? diff < 0 : diff > 0
    const signe = diff > 0 ? '+' : ''
    return {
      texte: `${signe}${diff} kg ${periode} · ${estPositif ? 'en bonne voie, continue' : 'à surveiller'}`,
      positif: estPositif,
      hausse: diff > 0
    }
  }

  const metriquesCles = [
    {
      label: 'Masse grasse', val: derniere?.masse_grasse, pct: derniere?.masse_grasse_pct,
      positifSiDiminue: true
    },
    {
      label: 'Masse musculaire', val: derniere?.masse_musculaire, pct: derniere?.masse_musculaire_pct,
      positifSiDiminue: false
    },
  ]

  const metriquesSecondaires = [
    {
      label: 'Masse hydrique', val: derniere?.masse_hydrique, pct: derniere?.masse_hydrique_pct,
      prev: avant?.masse_hydrique, color: '#378ADD'
    },
    {
      label: 'Masse maigre', val: derniere?.masse_maigre,
      prev: avant?.masse_maigre, color: '#7c5cff'
    },
    {
      label: 'Masse osseuse', val: derniere?.masse_osseuse,
      prev: avant?.masse_osseuse, color: '#8a807a'
    },
  ]

  return (
    <div className="flex flex-col gap-[22px] mb-[22px]">

      {/* Bloc héros — gras/muscle + secondaires alignées en hauteur */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-[22px] items-stretch">

        <div className="rounded-[26px] bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] p-[28px_30px] text-white shadow-[0_20px_40px_-18px_rgba(255,107,74,0.5)] flex flex-col justify-center">
          {metriquesCles.map((m, i) => {
            const diffHier = diffEt(m.val, sorted[1]?.[m.label === 'Masse grasse' ? 'masse_grasse' : 'masse_musculaire'])
            const diff7j = diffEt(m.val, mesure7j?.[m.label === 'Masse grasse' ? 'masse_grasse' : 'masse_musculaire'])
            const narratif = texteNarratif(diffHier, diff7j, m.positifSiDiminue)
            return (
              <div key={m.label}>
                {i > 0 && <div className="h-px bg-white/25 my-5" />}
                <div className="text-[13px] font-bold opacity-90 tracking-wide uppercase">{m.label}</div>
                <div className="flex items-baseline gap-2.5 mt-2.5">
                  <span className={i === 0 ? 'text-[40px] font-extrabold leading-none' : 'text-[32px] font-extrabold leading-none'}>
                    {m.val || '—'}
                  </span>
                  <span className="text-base opacity-85">{m.val ? `kg${m.pct ? ` · ${m.pct}%` : ''}` : ''}</span>
                </div>
                {narratif && (
                  <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-xl px-3.5 py-2 mt-3.5 text-sm font-bold">
                    <span>{narratif.positif === null ? '•' : narratif.hausse ? '↑' : '↓'}</span>
                    <span>{narratif.texte}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3.5">
          {metriquesSecondaires.map(m => {
            const diff = diffEt(m.val, m.prev)
            return (
              <div key={m.label} className="flex-1 bg-white rounded-[18px] p-[18px] shadow-[0_8px_18px_-14px_rgba(0,0,0,0.18)] flex flex-col justify-center">
                <div className="text-xs font-bold tracking-wide" style={{ color: m.color }}>{m.label.toUpperCase()}</div>
                <div className="flex items-baseline justify-between mt-2">
                  <div className="text-xl font-extrabold text-[#2a1a12]">
                    {m.val ? `${m.val} kg` : '—'} {m.pct && <span className="text-xs font-medium text-[#b0a8a2]">{m.pct}%</span>}
                  </div>
                  {diff !== null && (
                    <div className={`text-xs font-bold ${diff === 0 ? 'text-[#8a807a]' : diff < 0 ? 'text-[#13a884]' : 'text-[#d97706]'}`}>
                      {diff === 0 ? 'stable' : `${diff > 0 ? '+' : ''}${diff} kg`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Analyse IA — carte avec contexte + action */}
      <div className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] p-[24px_28px] text-white">
        {!analyseIA && (
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
                <span className="text-[13px] font-extrabold tracking-wide">ANALYSE IA</span>
              </div>
              <p className="m-0 text-sm leading-relaxed opacity-90">
                Ton coach peut croiser ces 5 mesures avec ton historique pour te dire si ta perte de gras est sur la bonne trajectoire.
              </p>
            </div>
            <button
              onClick={analyserComposition}
              disabled={loadingIA || !derniere}
              className="flex-none border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-5 py-3 rounded-2xl transition-all disabled:opacity-40"
            >
              {loadingIA ? 'Analyse en cours...' : 'Analyser ✨'}
            </button>
          </div>
        )}
        {analyseIA && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
              <span className="text-[13px] font-extrabold tracking-wide">ANALYSE IA</span>
            </div>
            <div className="text-sm leading-relaxed mb-3 font-medium">{analyseIA.analyse}</div>
            {analyseIA.points?.map((p, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <span className={`text-xs mt-0.5 ${p.positif ? 'text-[#7be8b5]' : 'text-[#ffc78a]'}`}>
                  {p.positif ? '✓' : '→'}
                </span>
                <span className="text-xs opacity-90">{p.texte}</span>
              </div>
            ))}
            <button onClick={() => onAnalyseUpdate?.(null)} className="text-xs opacity-70 underline mt-3">
              Fermer
            </button>
          </div>
        )}
      </div>

      {/* Header actions + formulaire + graphique */}
      <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[18px] font-extrabold text-[#2a1a12]">Historique des mesures</div>
            <div className="text-[13px] text-[#8a807a] mt-0.5">
              {derniere ? `Dernière mesure : ${new Date(derniere.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Aucune mesure encore'}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGraphique(!showGraphique)} className="text-[13px] font-semibold border border-[#f3eee9] rounded-xl px-4 py-2 text-[#2a1a12] hover:bg-[#fff3ea] transition-all">
              {showGraphique ? 'Masquer' : '📈 Évolution'}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`text-[13px] font-semibold px-4 py-2 rounded-xl transition-all ${
                succes
                  ? 'bg-[#16c79a] text-white'
                  : showForm
                    ? 'border border-[#f3eee9] text-[#2a1a12] hover:bg-[#fff3ea]'
                    : 'bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)]'
              }`}
            >
              {succes ? '✓ Ajouté !' : showForm ? 'Annuler' : '+ Mesure'}
            </button>
          </div>
        </div>

        {showGraphique && (
          <div className="mt-5 pt-5 border-t border-[#f3eee9]">
            <GraphiqueComposition composition={composition} />
          </div>
        )}

        {showForm && (
          <div className="mt-5 pt-5 border-t border-[#f3eee9]">
            <div className="flex justify-end mb-3">
              <input type="date" className="border border-[#f3eee9] rounded-xl px-3 py-2 text-sm" value={date} onChange={e => setDate(e.target.value)} />
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
                  <label className="text-xs text-[#8a807a] block mb-1">{label}</label>
                  <input type="number" step="0.1" className="w-full border border-[#f3eee9] rounded-xl px-3 py-2 text-sm" placeholder="0.0" value={val} onChange={e => setter(e.target.value)} />
                </div>
              ))}
            </div>
            <button
              onClick={ajouter}
              disabled={loading}
              className="w-full rounded-xl py-2.5 text-sm font-bold bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)] transition-all disabled:opacity-40"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer la mesure'}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}