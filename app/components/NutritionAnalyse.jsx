'use client'
import { useState } from 'react'
import GraphiqueCalories from './GraphiqueCalories'
import GraphiqueMacros from './GraphiqueMacros'

export default function NutritionAnalyse({ repas, objectifs, seances, poids, composition, macros, budget, tendances }) {
  const [synthese, setSynthese] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)

  async function genererSynthese() {
    setLoadingIA(true)
    const budgetMoyen7j = Math.round(
      (budget.tmb + Math.round(budget.tmb * 0.1) - (objectifs?.deficit_cible || 750))
    )
    try {
      const res = await fetch('/api/analyse-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repas, objectifs, tendances, budgetMoyen7j })
      })
      const data = await res.json()
      if (data.bilan) setSynthese(data)
    } catch(e) { console.error(e) }
    setLoadingIA(false)
  }

  const kcalObj = budget.budgetJour

  const pct7 = tendances.pctRespect7j
  const pct30 = tendances.pctRespect30j
  const moyKcal7 = tendances.moyKcal7j
  const moyProt7 = tendances.moyProt7j

  function getJourStr(offsetJours) {
    const d = new Date()
    d.setDate(d.getDate() - offsetJours)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Construit la série jour par jour (respecté/dépassé/pas de donnée) pour une fenêtre donnée
  function serieRespect(nbJours) {
    return Array.from({ length: nbJours }, (_, i) => {
      const dateStr = getJourStr(nbJours - 1 - i)
      const repasJour = repas.filter(r => r.date === dateStr)
      const kcalJour = repasJour.reduce((s, r) => s + (r.kcal || 0), 0)
      const aDesDonnees = repasJour.length > 0
      return { dateStr, kcalJour, aDesDonnees, respecte: aDesDonnees && kcalJour <= kcalObj }
    })
  }

  const serie14 = serieRespect(14)
  const jourRespectés14 = serie14.filter(j => j.respecte).length
  const pct14 = serie14.filter(j => j.aDesDonnees).length > 0
    ? Math.round(jourRespectés14 / serie14.filter(j => j.aDesDonnees).length * 100)
    : 0

  const fenetres = [
    { label: '7 derniers jours', pct: pct7, respectes: tendances.joursRespectés7j, total: 7 },
    { label: '14 derniers jours', pct: pct14, respectes: jourRespectés14, total: serie14.filter(j => j.aDesDonnees).length },
    { label: '30 derniers jours', pct: pct30, respectes: tendances.joursRespectés30j, total: 30 },
  ]

  const couleurPct = (pct) => pct >= 80 ? '#16c79a' : pct >= 50 ? '#EF9F27' : '#e2553f'
  const couleurPctBg = (pct) => pct >= 80 ? '#d4f5ec' : pct >= 50 ? '#faeeda' : '#ffe4dc'

  return (
    <div className="flex flex-col gap-[22px]">

      {/* Respect des objectifs — anneaux simples */}
      <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="text-[18px] font-extrabold text-[#2a1a12] mb-1">Respect des objectifs</div>
        <div className="text-[13px] text-[#8a807a] mb-6">Pourcentage de jours où tu es resté sous ton budget calorique</div>

        <div className="grid grid-cols-3 gap-4">
          {fenetres.map(f => (
            <div key={f.label} className="flex flex-col items-center rounded-2xl py-6 px-3" style={{ background: couleurPctBg(f.pct) }}>
              <div className="relative w-[104px] h-[104px]">
                <svg width="104" height="104" viewBox="0 0 104 104">
                  <circle cx="52" cy="52" r="44" fill="none" stroke="white" strokeWidth="11" />
                  <circle cx="52" cy="52" r="44" fill="none"
                    stroke={couleurPct(f.pct)}
                    strokeWidth="11" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - f.pct / 100)}`}
                    transform="rotate(-90 52 52)"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold" style={{ color: couleurPct(f.pct) }}>{f.pct}%</span>
                </div>
              </div>
              <span className="text-[13px] font-bold text-[#2a1a12] mt-3 text-center">{f.label}</span>
              <span className="text-xs text-[#8a807a] mt-0.5">{f.respectes}/{f.total} jours</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          {[
            { label: 'Moy. calories / jour (7j)', value: moyKcal7, unit: 'kcal', obj: kcalObj },
            { label: 'Moy. protéines / jour (7j)', value: moyProt7, unit: 'g', obj: macros?.proteines || 166 },
          ].map(item => (
            <div key={item.label} className="bg-[#f9f6f3] rounded-2xl p-4">
              <div className="text-xs text-[#8a807a] font-medium mb-2">{item.label}</div>
              <div className="text-2xl font-extrabold text-[#2a1a12]">
                {item.value} <span className="text-sm font-medium text-[#b0a8a2]">{item.unit}</span>
              </div>
              <div className="text-xs text-[#b0a8a2] mt-1">Objectif : {item.obj} {item.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <GraphiqueCalories repas={repas} seances={seances} objectifs={objectifs} />
      <GraphiqueMacros repas={repas} objectifs={objectifs} />

      {/* Synthèse IA */}
      <div className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden">
        <div className="flex items-center gap-2.5 px-7 py-5">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
          <div>
            <div className="text-[15px] font-extrabold">Synthèse IA</div>
            <div className="text-xs opacity-70 mt-0.5">Analyse personnalisée de tes habitudes nutritionnelles</div>
          </div>
        </div>
        <div className="px-7 pb-7">
          {!synthese && (
            <div className="text-center py-4">
              <button
                onClick={genererSynthese}
                disabled={loadingIA}
                className="border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-6 py-2.5 rounded-xl transition-all disabled:opacity-40"
              >
                {loadingIA ? 'Analyse en cours...' : 'Générer ma synthèse ✨'}
              </button>
            </div>
          )}
          {synthese && (
            <div>
              <div className="bg-white/[0.08] rounded-2xl p-4 mb-3">
                <div className="text-sm leading-relaxed font-medium">{synthese.bilan}</div>
              </div>
              {synthese.positifs?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold opacity-80 mb-2 tracking-wide">CE QUI VA BIEN</div>
                  {synthese.positifs.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <span className="text-[#7be8b5] text-sm">✓</span>
                      <span className="text-sm opacity-90">{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {synthese.conseils?.length > 0 && (
                <div>
                  <div className="text-xs font-bold opacity-80 mb-2 tracking-wide">CONSEILS</div>
                  {synthese.conseils.map((c, i) => (
                    <div key={i} className="bg-white/[0.08] rounded-xl p-3 mb-2">
                      <div className="text-sm font-bold mb-1">{c.titre}</div>
                      <div className="text-xs opacity-80">{c.detail}</div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setSynthese(null)} className="text-xs opacity-70 underline mt-3">
                Regénérer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}