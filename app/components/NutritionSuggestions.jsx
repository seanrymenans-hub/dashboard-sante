'use client'
import { useState, useEffect } from 'react'

export default function NutritionSuggestions({ repas, objectifs, composition, poids, macros, budget }) {
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState('')
  const [editingPrefs, setEditingPrefs] = useState(false)
  const [tempPrefs, setTempPrefs] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('nutrition-preferences')
    if (saved) setPreferences(saved)
  }, [])

  function sauvegarderPreferences() {
    localStorage.setItem('nutrition-preferences', tempPrefs)
    setPreferences(tempPrefs)
    setEditingPrefs(false)
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const repasAujourdhui = repas.filter(r => r.date === today)
  const kcalMange = budget.kcalConsommees
  const protMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.proteines || 0), 0))
  const carbMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.glucides || 0), 0))
  const lipMange = Math.round(repasAujourdhui.reduce((s, r) => s + (r.lipides || 0), 0))
  const kcalObj = budget.budgetJour
  const protObj = macros?.proteines || 166
  const carbObj = macros?.glucides || 91
  const lipObj = macros?.lipides || 38
  const kcalRestant = budget.kcalRestantes

  async function genererSuggestions() {
    setLoading(true)
    try {
      const res = await fetch('/api/suggestion-repas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repas, objectifs, composition, poids, preferences,
          // Valeurs déjà calculées côté client — évite que l'IA doive
          // re-déduire le budget restant à partir de repas/objectifs bruts,
          // ce qui produisait des suggestions mal calibrées (ex: 300 kcal
          // alors qu'il restait bien plus de marge).
          kcalRestant,
          protRestant: Math.max(0, protObj - protMange),
          carbRestant: Math.max(0, carbObj - carbMange),
          lipRestant: Math.max(0, lipObj - lipMange),
        })
      })
      const data = await res.json()
      if (data.suggestions) setSuggestions(data.suggestions)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const restants = [
    { label: 'Calories', value: kcalRestant, unit: 'kcal', bg: '#ffe4dc', text: '#e2553f' },
    { label: 'Protéines', value: Math.max(0, protObj - protMange), unit: 'g', bg: '#dceeff', text: '#185fa5' },
    { label: 'Glucides', value: Math.max(0, carbObj - carbMange), unit: 'g', bg: '#faeeda', text: '#854f0b' },
    { label: 'Lipides', value: Math.max(0, lipObj - lipMange), unit: 'g', bg: '#d4f5ec', text: '#0f6e56' },
  ]

  return (
    <div className="flex flex-col gap-[22px]">

      {/* Macros restantes */}
      <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="text-[18px] font-extrabold text-[#2a1a12] mb-5">Il te reste aujourd'hui</div>
        <div className="grid grid-cols-4 gap-3">
          {restants.map(item => (
            <div key={item.label} className="rounded-2xl p-4 text-center" style={{ background: item.bg }}>
              <div className="text-xl font-extrabold" style={{ color: item.text }}>{item.value}</div>
              <div className="text-xs mt-1 font-medium opacity-80" style={{ color: item.text }}>{item.unit} {item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Préférences */}
      <div className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="flex justify-between items-center px-7 py-5">
          <div>
            <div className="text-[18px] font-extrabold text-[#2a1a12]">Mes préférences alimentaires</div>
            {!editingPrefs && (
              <div className="text-[13px] text-[#8a807a] mt-1">
                {preferences ? preferences.slice(0, 80) + (preferences.length > 80 ? '...' : '') : 'Non configuré — suggestions génériques'}
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditingPrefs(!editingPrefs); setTempPrefs(preferences) }}
            className="text-[13px] font-semibold border border-[#f3eee9] rounded-xl px-4 py-2 text-[#2a1a12] hover:bg-[#fff3ea] transition-all flex-shrink-0"
          >
            {editingPrefs ? 'Annuler' : preferences ? 'Modifier' : '+ Configurer'}
          </button>
        </div>

        {editingPrefs && (
          <div className="px-7 pb-7">
            <textarea
              className="w-full border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm text-[#2a1a12] resize-none mb-3"
              rows={4}
              placeholder="Ex: J'aime le poulet, les œufs, le riz. Je n'aime pas le poisson. Je suis sans lactose..."
              value={tempPrefs}
              onChange={e => setTempPrefs(e.target.value)}
            />
            <button
              onClick={sauvegarderPreferences}
              className="bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)]"
            >
              Sauvegarder
            </button>
          </div>
        )}
      </div>

      {/* Suggestions IA */}
      <div className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden">
        <div className="flex justify-between items-center px-7 py-5">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
            <div>
              <div className="text-[15px] font-extrabold">Suggestions personnalisées</div>
              <div className="text-xs opacity-70 mt-0.5">
                Basées sur tes macros restantes{preferences ? ' et tes préférences' : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="px-7 pb-7">
          {!suggestions && !loading && (
            <div className="text-center py-6">
              <div className="text-sm opacity-80 mb-4">
                {kcalRestant > 0
                  ? `Il te reste ${kcalRestant} kcal — l'IA va suggérer quoi manger`
                  : 'Tu as atteint ton objectif calorique 🎉'
                }
              </div>
              <button
                onClick={genererSuggestions}
                className="border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all"
              >
                Générer mes suggestions ✨
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-6 text-sm opacity-70">
              L'IA analyse tes besoins...
            </div>
          )}

          {suggestions && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {suggestions.map((s, i) => (
                  <div key={i} className="bg-white/[0.08] rounded-2xl p-4">
                    <div className="font-bold text-sm mb-1">{s.nom}</div>
                    <div className="text-xs opacity-70 mb-3">{s.description}</div>
                    <div className="flex gap-2 flex-wrap mb-3 items-center">
                      <span className="font-bold text-sm">{s.kcal} kcal</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#dceeff] text-[#185fa5] font-semibold">P {s.proteines}g</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#faeeda] text-[#854f0b] font-semibold">G {s.glucides}g</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#d4f5ec] text-[#0f6e56] font-semibold">L {s.lipides}g</span>
                    </div>
                    <div className="mb-3">
                      {s.ingredients?.map((ing, j) => (
                        <div key={j} className="text-xs opacity-75">· {ing}</div>
                      ))}
                    </div>
                    <div className="text-xs bg-white/[0.08] rounded-xl p-2.5 italic opacity-90">
                      {s.raison}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={genererSuggestions}
                className="text-xs opacity-70 underline"
              >
                ↺ Regénérer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}