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
  const protObj = macros?.proteines || 166
  const carbObj = macros?.glucides || 91
  const lipObj = macros?.lipides || 38

  const kcalMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.kcal || 0), 0))
  const protMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.proteines || 0), 0))
  const carbMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.glucides || 0), 0))
  const lipMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.lipides || 0), 0))
  const kcalRestant = Math.max(0, kcalObj - kcalMange)
  const pctKcal = Math.min(100, Math.round(kcalMange / kcalObj * 100))

  const types = [
    { value: 'petit-dejeuner', label: 'Petit-déj', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'dejeuner', label: 'Déjeuner', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'diner', label: 'Dîner', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'snack', label: 'Snack', color: 'bg-green-50 text-green-700 border-green-200' },
  ]
  const typeMap = Object.fromEntries(types.map(t => [t.value, t]))

  const macrosBars = [
    { label: 'Protéines', value: protMange, obj: protObj, bar: 'bg-blue-400', pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
    { label: 'Glucides', value: carbMange, obj: carbObj, bar: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
    { label: 'Lipides', value: lipMange, obj: lipObj, bar: 'bg-green-400', pill: 'bg-green-50 text-green-700', dot: 'bg-green-400' },
  ]

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
    <div className="flex flex-col gap-4">

      {/* Résumé du jour */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="font-medium">
            {isToday ? "Aujourd'hui" : new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() - 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm"
            >←</button>
            <button
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() + 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
              disabled={isToday}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm"
            >→</button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-xs text-blue-500 hover:underline"
              >
                Aujourd'hui
              </button>
            )}
          </div>
        </div>

        {/* Calories */}
        <div className="flex items-center gap-5 mb-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none"
                stroke={pctKcal >= 100 ? '#ef4444' : '#60a5fa'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pctKcal / 100)}`}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">{pctKcal}%</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{kcalMange}</div>
              <div className="text-xs text-blue-500 mt-1">kcal mangées</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center relative">
              <button
                onClick={() => setShowBudgetDetail(!showBudgetDetail)}
                className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center hover:bg-blue-100 hover:text-blue-500"
              >?</button>
              <div className="text-xl font-bold text-gray-700">{kcalObj}</div>
              <div className="text-xs text-gray-400 mt-1">kcal objectif</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-green-700">{kcalRestant}</div>
              <div className="text-xs text-green-500 mt-1">kcal restantes</div>
            </div>
          </div>
          {showBudgetDetail && (
          <div className="mb-4 bg-blue-50 rounded-xl p-4 text-xs text-gray-600">
            <div className="font-medium text-gray-700 mb-2">📊 Calcul du budget calorique</div>
            {isToday ? (
              <div className="space-y-1">
                <div className="flex justify-between"><span>TMB</span><span>+{budget.tmb} kcal</span></div>
                <div className="flex justify-between"><span>Effet thermique (~10%)</span><span>+{Math.round(budget.tmb * 0.1)} kcal</span></div>
                <div className="flex justify-between"><span>👟 Pas</span><span>+{budget.kcalPas} kcal</span></div>
                <div className="flex justify-between"><span>🏋️ Sport</span><span>+{budget.kcalSport} kcal</span></div>
                <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between font-medium text-gray-700"><span>Dépense totale</span><span>{budget.depenseTotal} kcal</span></div>
                <div className="flex justify-between text-red-500"><span>Déficit cible</span><span>-{budget.deficitCible} kcal</span></div>
                <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between font-medium text-blue-700"><span>Budget du jour</span><span>{kcalObj} kcal</span></div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between"><span>TMB</span><span>+{budgetHistorique?.tmb || objectifs?.tmb} kcal</span></div>
                <div className="flex justify-between"><span>Effet thermique (~10%)</span><span>+{budgetHistorique?.tef || Math.round((objectifs?.tmb || 1875) * 0.1)} kcal</span></div>
                <div className="flex justify-between"><span>👟 Pas</span><span>+{budgetHistorique?.kcal_pas || 0} kcal</span></div>
                <div className="flex justify-between"><span>🏋️ Sport</span><span>+{budgetHistorique?.kcal_sport || 0} kcal</span></div>
                <div className="flex justify-between text-red-500"><span>Déficit cible</span><span>-{budgetHistorique?.deficit_cible || objectifs?.deficit_cible} kcal</span></div>
                <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between font-medium text-blue-700"><span>Budget du jour</span><span>{kcalObj} kcal</span></div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Barres macros */}
        <div className="flex flex-col gap-3">
          {macrosBars.map(m => {
            const pct = Math.min(100, Math.round(m.value / m.obj * 100))
            const restant = Math.max(0, m.obj - m.value)
            return (
              <div key={m.label}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${m.dot}`} />
                    <span className="text-xs text-gray-500">{m.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{m.value}g</span>
                    <span className="text-xs text-gray-400">/ {m.obj}g</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.pill}`}>{restant}g restants</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${m.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Repas du jour */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
          <div className="font-medium">Repas du jour</div>
          <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{repasAujourdhui.length} repas</span>
        </div>

        {repasAujourdhui.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Aucun repas enregistré aujourd'hui
          </div>
        ) : (
          <div>
            {repasAujourdhui.map((r, idx) => {
              const t = typeMap[r.type] || { label: r.type, color: 'bg-gray-100 text-gray-500 border-gray-200' }
              return (
                <div key={r.id} className={`flex items-center gap-3 px-6 py-3 ${idx < repasAujourdhui.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border flex-shrink-0 ${t.color}`}>
                    {t.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{r.nom}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      P {Math.round(r.proteines || 0)}g · G {Math.round(r.glucides || 0)}g · L {Math.round(r.lipides || 0)}g
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700 flex-shrink-0">{r.kcal} kcal</div>
                  <button onClick={() => supprimerRepas(r.id)} className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Logger repas */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowLogger(!showLogger)}
          className={`w-full flex justify-between items-center px-6 py-4 text-left ${showLogger ? 'border-b border-gray-50' : ''}`}
        >
          <span className="font-medium">Ajouter un repas</span>
          <span className="text-gray-400 text-lg">{showLogger ? '−' : '+'}</span>
        </button>

        {showLogger && (
          <div className="px-6 py-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {types.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTypeRepas(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${typeRepas === t.value ? t.color : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: 150g de poulet grillé, 2 œufs brouillés..."
                value={nomAliment}
                onChange={e => { setNomAliment(e.target.value); setPreview(null) }}
                onKeyDown={e => e.key === 'Enter' && estimerMacros()}
              />
              <button
                onClick={estimerMacros}
                disabled={loadingIA || !nomAliment.trim()}
                className="bg-black text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                {loadingIA ? '...' : '✨ Estimer'}
              </button>
            </div>

            {preview && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium text-gray-800 mb-2">{preview.nom}</div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">P {preview.proteines}g</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">G {preview.glucides}g</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">L {preview.lipides}g</span>
                    </div>
                  </div>
                  <span className="text-base font-medium text-gray-800">{preview.kcal} kcal</span>
                </div>
                {preview.note && <div className="text-xs text-gray-400 italic mb-3">{preview.note}</div>}
                <div className="flex gap-2">
                  <button
                    onClick={ajouterRepas}
                    disabled={loadingAjout}
                    className="flex-1 bg-black text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40"
                  >
                    {loadingAjout ? '...' : '+ Ajouter ce repas'}
                  </button>
                  <button onClick={() => setPreview(null)} className="text-sm text-gray-400 px-3">
                    Modifier
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}