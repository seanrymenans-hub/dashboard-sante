'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NutritionAujourdhui({ repas, objectifs, onRefresh, seances, dailyBudgets, budgetJour = 0, budget, macros }) {
  const [nomAliment, setNomAliment] = useState('')
  const [typeRepas, setTypeRepas] = useState('dejeuner')
  const [preview, setPreview] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [loadingAjout, setLoadingAjout] = useState(false)
  const [showLogger, setShowLogger] = useState(false)
  const [showBudgetDetail, setShowBudgetDetail] = useState(false)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const repasAujourdhui = repas.filter(r => r.date === selectedDate)
  const isToday = selectedDate === todayStr

  const budgetHistorique = dailyBudgets?.find(b => b.date === selectedDate)
  const kcalObj = isToday
    ? (budgetJour || Math.max(1200, (objectifs?.tmb || 1875) + Math.round((objectifs?.tmb || 1875) * 0.1) - (objectifs?.deficit_cible || 750)))
    : (budgetHistorique?.budget_jour || Math.max(1200, (objectifs?.tmb || 1875) + Math.round((objectifs?.tmb || 1875) * 0.1) - (objectifs?.deficit_cible || 750)))
  const poidsActuelPourMacros = objectifs?.poids_depart || 83
  const protObjFixe = Math.round(poidsActuelPourMacros * 2)
  const lipObjHistorique = budgetHistorique ? Math.round(budgetHistorique.budget_jour * 0.25 / 9) : 38
  const glucObjHistorique = budgetHistorique ? Math.round((budgetHistorique.budget_jour - protObjFixe * 4 - lipObjHistorique * 9) / 4) : 91

  const protObj = isToday ? (macros?.proteines || 166) : protObjFixe
  const carbObj = isToday ? (macros?.glucides || 91) : Math.max(0, glucObjHistorique)
  const lipObj = isToday ? (macros?.lipides || 38) : lipObjHistorique

  const kcalMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.kcal || 0), 0))
  const protMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.proteines || 0), 0))
  const carbMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.glucides || 0), 0))
  const lipMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.lipides || 0), 0))
  const kcalRestant = Math.max(0, kcalObj - kcalMange)
  const pctKcal = Math.min(100, Math.round(kcalMange / kcalObj * 100))

  const types = [
    { value: 'petit-dejeuner', label: 'Petit-déj', bg: '#faeeda', text: '#854f0b' },
    { value: 'dejeuner', label: 'Déjeuner', bg: '#dceeff', text: '#185fa5' },
    { value: 'diner', label: 'Dîner', bg: '#ece6ff', text: '#534ab7' },
    { value: 'snack', label: 'Snack', bg: '#d4f5ec', text: '#0f6e56' },
  ]
  const typeMap = Object.fromEntries(types.map(t => [t.value, t]))

  const macrosBars = [
    { label: 'Protéines', value: protMange, obj: protObj, color: '#378ADD', bg: '#dceeff', text: '#185fa5' },
    { label: 'Glucides', value: carbMange, obj: carbObj, color: '#EF9F27', bg: '#faeeda', text: '#854f0b' },
    { label: 'Lipides', value: lipMange, obj: lipObj, color: '#16c79a', bg: '#d4f5ec', text: '#0f6e56' },
  ]

  // Repère contextuel : à quelle heure de la journée es-tu censé avoir
  // mangé quelle proportion de tes macros ? On modélise une courbe simple
  // (peu le matin, accélération midi/soir) plutôt qu'une ligne droite,
  // pour ne pas alerter inutilement à 9h du matin.
  function pctAttenduSelonHeure() {
    const heure = now.getHours() + now.getMinutes() / 60
    if (heure < 8) return 0
    if (heure < 13) return 20 + (heure - 8) * 6 // 20% → 50% entre 8h et 13h
    if (heure < 20) return 50 + (heure - 13) * 6 // 50% → 92% entre 13h et 20h
    return 95
  }

  const macroEnRetard = isToday ? (() => {
    const pctAttendu = pctAttenduSelonHeure()
    if (pctAttendu < 15) return null // trop tôt pour juger
    const ecarts = macrosBars
      .map(m => ({ ...m, pctReel: Math.min(100, Math.round(m.value / m.obj * 100)) }))
      .map(m => ({ ...m, retard: pctAttendu - m.pctReel }))
      .filter(m => m.retard > 20) // au moins 20 points de retard pour signaler
      .sort((a, b) => b.retard - a.retard)
    return ecarts[0] || null
  })() : null

  // Repas triés chronologiquement par heure de création (si dispo), sinon par type
  const ordreTypes = { 'petit-dejeuner': 0, 'dejeuner': 1, 'snack': 2, 'diner': 3 }
  const repasChronologiques = [...repasAujourdhui].sort((a, b) => {
    if (a.heure && b.heure) return a.heure.localeCompare(b.heure)
    return (ordreTypes[a.type] ?? 9) - (ordreTypes[b.type] ?? 9)
  })

  async function estimerMacros() {
    if (!nomAliment.trim()) return
    setLoadingIA(true)
    setPreview(null)
    try {
      const res = await fetch('/api/estimer-aliment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliment: nomAliment })
      })
      const data = await res.json()
      if (data.kcal) setPreview(data)
    } catch(e) { console.error(e) }
    setLoadingIA(false)
  }

  async function ajouterRepas() {
    if (!preview) return
    setLoadingAjout(true)
    await supabase.from('repas').insert({
      date: selectedDate, type: typeRepas, nom: preview.nom,
      kcal: preview.kcal, proteines: preview.proteines,
      glucides: preview.glucides, lipides: preview.lipides,
    })
    setNomAliment('')
    setPreview(null)
    setShowLogger(false)
    setLoadingAjout(false)
    onRefresh()
  }

  async function supprimerRepas(id) {
    await supabase.from('repas').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-[22px]">

      {/* Résumé du jour */}
      <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex justify-between items-center mb-5">
          <div className="text-[18px] font-extrabold text-[#2a1a12]">
            {isToday ? "Aujourd'hui" : new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {isToday && pctKcal >= 90 && pctKcal <= 105 && (
              <span className="ml-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#13a884] bg-[#d4f5ec] px-2.5 py-1 rounded-full align-middle">
                🎯 dans la cible
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() - 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f9f6f3] text-[#5a4f48] hover:bg-[#fff3ea] hover:text-[#ff6b4a] transition-colors text-sm font-bold"
            >←</button>
            <button
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() + 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
              disabled={isToday}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f9f6f3] text-[#5a4f48] hover:bg-[#fff3ea] hover:text-[#ff6b4a] transition-colors disabled:opacity-30 disabled:hover:bg-[#f9f6f3] disabled:hover:text-[#5a4f48] text-sm font-bold"
            >→</button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-xs font-bold text-[#ff6b4a] hover:underline ml-1"
              >
                Aujourd'hui
              </button>
            )}
          </div>
        </div>

        {/* Calories */}
        <div className="flex items-center gap-6 mb-2">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#f3eee9" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none"
                stroke={pctKcal >= 100 ? '#e2553f' : '#ff8a3d'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pctKcal / 100)}`}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-extrabold text-[#2a1a12]">{pctKcal}%</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-[1fr_1fr_1.2fr] gap-3">
            <div className="bg-[#fff3ea] rounded-2xl p-3.5 text-center">
              <div className="text-xl font-extrabold text-[#ff6b4a]">{kcalMange}</div>
              <div className="text-xs text-[#c2876b] mt-1 font-medium">kcal mangées</div>
            </div>
            <div className="bg-[#f9f6f3] rounded-2xl p-3.5 text-center relative">
              <button
                onClick={() => setShowBudgetDetail(!showBudgetDetail)}
                className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#e8e1da] text-[#8a807a] text-xs flex items-center justify-center hover:bg-[#ff6b4a] hover:text-white transition-colors"
              >?</button>
              <div className="text-xl font-extrabold text-[#2a1a12]">{kcalObj}</div>
              <div className="text-xs text-[#8a807a] mt-1 font-medium">kcal objectif</div>
            </div>
            <div className="bg-gradient-to-br from-[#16c79a] to-[#13a884] rounded-2xl p-3.5 text-center">
              <div className="text-xl font-extrabold text-white">{kcalRestant}</div>
              <div className="text-xs text-white/85 mt-1 font-medium">kcal restantes</div>
            </div>
          </div>
        </div>

        {showBudgetDetail && (
          <div className="mb-5 mt-3 bg-[#fff3ea] rounded-2xl p-4 text-xs text-[#5a4f48]">
            <div className="font-bold text-[#2a1a12] mb-2">📊 Calcul du budget calorique</div>
            {isToday ? (
              <div className="space-y-1">
                <div className="flex justify-between"><span>TMB</span><span>+{budget.tmb} kcal</span></div>
                <div className="flex justify-between"><span>Effet thermique (~10%)</span><span>+{Math.round(budget.tmb * 0.1)} kcal</span></div>
                <div className="flex justify-between"><span>👟 Pas</span><span>+{budget.kcalPas} kcal</span></div>
                <div className="flex justify-between"><span>🏋️ Sport</span><span>+{budget.kcalSport} kcal</span></div>
                <div className="border-t border-[#f0e4d8] pt-1 mt-1 flex justify-between font-bold text-[#2a1a12]"><span>Dépense totale</span><span>{budget.depenseTotal} kcal</span></div>
                <div className="flex justify-between text-[#e2553f]"><span>Déficit cible</span><span>-{budget.deficitCible} kcal</span></div>
                <div className="border-t border-[#f0e4d8] pt-1 mt-1 flex justify-between font-bold text-[#ff6b4a]"><span>Budget du jour</span><span>{kcalObj} kcal</span></div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between"><span>TMB</span><span>+{budgetHistorique?.tmb || objectifs?.tmb} kcal</span></div>
                <div className="flex justify-between"><span>Effet thermique (~10%)</span><span>+{budgetHistorique?.tef || Math.round((objectifs?.tmb || 1875) * 0.1)} kcal</span></div>
                <div className="flex justify-between"><span>👟 Pas</span><span>+{budgetHistorique?.kcal_pas || 0} kcal</span></div>
                <div className="flex justify-between"><span>🏋️ Sport</span><span>+{budgetHistorique?.kcal_sport || 0} kcal</span></div>
                <div className="flex justify-between text-[#e2553f]"><span>Déficit cible</span><span>-{budgetHistorique?.deficit_cible || objectifs?.deficit_cible} kcal</span></div>
                <div className="border-t border-[#f0e4d8] pt-1 mt-1 flex justify-between font-bold text-[#ff6b4a]"><span>Budget du jour</span><span>{kcalObj} kcal</span></div>
              </div>
            )}
          </div>
        )}

        {/* Frise temporelle — parcours de la journée */}
        {isToday && (
          <div className="mt-6 pt-6 border-t border-[#f3eee9]">
            <div className="text-[13px] font-bold text-[#8a807a] mb-4 uppercase tracking-wide">Ton parcours du jour</div>
            <div className="relative">
              <div className="absolute left-0 right-0 top-[18px] h-[3px] bg-[#f3eee9] rounded-full" />
              <div
                className="absolute left-0 top-[18px] h-[3px] rounded-full transition-all duration-700"
                style={{ width: `${pctKcal}%`, background: pctKcal >= 100 ? '#e2553f' : '#ff8a3d' }}
              />
              <div className="relative flex justify-between">
                {['petit-dejeuner', 'dejeuner', 'snack', 'diner'].map(typeId => {
                  const repasDuType = repasChronologiques.filter(r => r.type === typeId)
                  const t = typeMap[typeId]
                  const aMange = repasDuType.length > 0
                  const kcalType = repasDuType.reduce((s, r) => s + (r.kcal || 0), 0)
                  return (
                    <div key={typeId} className="flex flex-col items-center" style={{ width: '23%' }}>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-[3px] border-white transition-all"
                        style={{ background: aMange ? t.bg : '#f3eee9', color: aMange ? t.text : '#d8cfc8', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.12)' }}
                      >
                        {aMange ? repasDuType.length : ''}
                      </div>
                      <span className="text-[11px] font-bold text-[#5a4f48] mt-2 text-center">{t.label}</span>
                      <span className="text-[11px] text-[#b0a8a2]">{aMange ? `${kcalType} kcal` : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Indicateur contextuel — macro la plus en retard pour l'heure qu'il est */}
        {macroEnRetard && (
          <div className="mt-6 rounded-2xl p-4 flex items-center gap-3" style={{ background: macroEnRetard.bg }}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: macroEnRetard.color }} />
            <span className="text-[13px] font-semibold" style={{ color: macroEnRetard.text }}>
              Il est {now.getHours()}h passé — tu es en retard sur tes {macroEnRetard.label.toLowerCase()} ({macroEnRetard.pctReel}% de l'objectif). Pense-y pour ton prochain repas.
            </span>
          </div>
        )}

        {/* Macros — anneaux */}
        <div className="mt-6 pt-6 border-t border-[#f3eee9]">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[15px] font-extrabold text-[#2a1a12]">Macros du jour</span>
            <span className="text-[13px] font-bold" style={{ color: pctKcal >= 100 ? '#e2553f' : '#ff8a3d' }}>{pctKcal}% de l'objectif</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {macrosBars.map(m => {
              const pct = Math.min(100, Math.round(m.value / m.obj * 100))
              return (
                <div key={m.label} className="flex flex-col items-center bg-[#f9f6f3] rounded-2xl py-6 px-3 relative overflow-hidden">
                  {/* Fil chromatique reliant cet anneau au bloc calories du haut */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: m.color }} />
                  <div className="relative w-[120px] h-[120px]">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#ece5dd" strokeWidth="13" />
                      <circle cx="60" cy="60" r="50" fill="none"
                        stroke={m.color}
                        strokeWidth="13" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-[#2a1a12] leading-none">{m.value}</span>
                      <span className="text-xs text-[#b0a8a2] mt-1">/ {m.obj}g</span>
                    </div>
                  </div>
                  <span className="text-[13px] font-bold mt-3" style={{ color: m.color }}>{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Repas du jour */}
      <div className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="flex justify-between items-center px-7 py-5">
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Repas du jour</div>
          <span className="text-xs font-bold bg-[#fff3ea] text-[#c2876b] px-3 py-1.5 rounded-full">{repasAujourdhui.length} repas</span>
        </div>

        {repasAujourdhui.length === 0 ? (
          <div className="px-7 py-8 text-center text-sm text-[#b0a8a2]">
            Aucun repas enregistré aujourd'hui
          </div>
        ) : (
          <div>
            {repasAujourdhui.map((r, idx) => {
              const t = typeMap[r.type] || { label: r.type, bg: '#f3eee9', text: '#8a807a' }
              return (
                <div key={r.id} className={`flex items-center gap-3 px-7 py-3.5 ${idx < repasAujourdhui.length - 1 ? 'border-b border-[#f6f1ec]' : ''}`}>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: t.bg, color: t.text }}>
                    {t.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#2a1a12] truncate">{r.nom}</div>
                    <div className="text-xs text-[#b0a8a2] mt-0.5">
                      P {Math.round(r.proteines || 0)}g · G {Math.round(r.glucides || 0)}g · L {Math.round(r.lipides || 0)}g
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#2a1a12] flex-shrink-0">{r.kcal} kcal</div>
                  <button onClick={() => supprimerRepas(r.id)} className="text-[#d8cfc8] hover:text-[#e2553f] text-sm flex-shrink-0 transition-colors">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bouton ouvrant la modal d'ajout */}
      <button
        onClick={() => setShowLogger(true)}
        className="rounded-[26px] bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white shadow-[0_12px_28px_-14px_rgba(255,107,74,0.6)] py-5 text-[15px] font-bold flex items-center justify-center gap-2 hover:shadow-[0_16px_32px_-14px_rgba(255,107,74,0.7)] transition-all"
      >
        <span className="text-lg leading-none">+</span> Ajouter un repas
      </button>

      {/* Modal d'ajout de repas */}
      {showLogger && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setShowLogger(false)}
        >
          <div
            className="bg-white rounded-[26px] shadow-2xl w-full max-w-[520px] max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-7 py-5 border-b border-[#f3eee9]">
              <span className="text-[18px] font-extrabold text-[#2a1a12]">Ajouter un repas</span>
              <button onClick={() => setShowLogger(false)} className="text-[#b0a8a2] hover:text-[#2a1a12] text-xl leading-none transition-colors">✕</button>
            </div>

            <div className="px-7 py-6">
              <div className="flex gap-2 mb-4 flex-wrap">
                {types.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTypeRepas(t.value)}
                    className="px-3.5 py-2 rounded-full text-xs font-bold transition-all"
                    style={typeRepas === t.value ? { background: t.bg, color: t.text } : { background: '#f9f6f3', color: '#8a807a' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  autoFocus
                  className="flex-1 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                  placeholder="Ex: 150g de poulet grillé, 2 œufs brouillés..."
                  value={nomAliment}
                  onChange={e => { setNomAliment(e.target.value); setPreview(null) }}
                  onKeyDown={e => e.key === 'Enter' && estimerMacros()}
                />
                <button
                  onClick={estimerMacros}
                  disabled={loadingIA || !nomAliment.trim()}
                  className="bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-40 flex-shrink-0"
                >
                  {loadingIA ? '...' : '✨ Estimer'}
                </button>
              </div>

              {preview && (
                <div className="bg-[#f9f6f3] rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-bold text-[#2a1a12] mb-2">{preview.nom}</div>
                      <div className="flex gap-2">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#dceeff] text-[#185fa5]">P {preview.proteines}g</span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#faeeda] text-[#854f0b]">G {preview.glucides}g</span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#d4f5ec] text-[#0f6e56]">L {preview.lipides}g</span>
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-[#2a1a12]">{preview.kcal} kcal</span>
                  </div>
                  {preview.note && <div className="text-xs text-[#b0a8a2] italic mb-3">{preview.note}</div>}
                  <div className="flex gap-2">
                    <button
                      onClick={ajouterRepas}
                      disabled={loadingAjout}
                      className="flex-1 bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)] disabled:opacity-40"
                    >
                      {loadingAjout ? '...' : '+ Ajouter ce repas'}
                    </button>
                    <button onClick={() => setPreview(null)} className="text-sm font-semibold text-[#8a807a] px-3">
                      Modifier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}