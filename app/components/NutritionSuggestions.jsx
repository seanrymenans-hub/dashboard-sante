'use client'
import { useState, useEffect } from 'react'
import { computeHealthEngine } from '../../lib/healthEngine'

export default function NutritionSuggestions({ repas, objectifs, composition, poids, macros }) {
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

  const { budget } = computeHealthEngine({ poids: [], repas, seances: [], composition: [], objectifs })
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
        body: JSON.stringify({ repas, objectifs, composition, poids, preferences })
      })
      const data = await res.json()
      if (data.suggestions) setSuggestions(data.suggestions)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const restants = [
    { label: 'Calories', value: kcalRestant, unit: 'kcal', color: 'bg-red-50 text-red-700' },
    { label: 'Protéines', value: Math.max(0, protObj - protMange), unit: 'g', color: 'bg-blue-50 text-blue-700' },
    { label: 'Glucides', value: Math.max(0, carbObj - carbMange), unit: 'g', color: 'bg-amber-50 text-amber-700' },
    { label: 'Lipides', value: Math.max(0, lipObj - lipMange), unit: 'g', color: 'bg-green-50 text-green-700' },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* Macros restantes */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="font-medium mb-4">Il te reste aujourd'hui</div>
        <div className="grid grid-cols-4 gap-3">
          {restants.map(item => (
            <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
              <div className="text-xl font-bold">{item.value}</div>
              <div className="text-xs mt-1 opacity-80">{item.unit} {item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Préférences */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
          <div>
            <div className="font-medium">Mes préférences alimentaires</div>
            {!editingPrefs && (
              <div className="text-xs text-gray-400 mt-1">
                {preferences ? preferences.slice(0, 80) + (preferences.length > 80 ? '...' : '') : 'Non configuré — suggestions génériques'}
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditingPrefs(!editingPrefs); setTempPrefs(preferences) }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50"
          >
            {editingPrefs ? 'Annuler' : preferences ? 'Modifier' : '+ Configurer'}
          </button>
        </div>

        {editingPrefs && (
          <div className="px-6 py-4">
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none mb-3"
              rows={4}
              placeholder="Ex: J'aime le poulet, les œufs, le riz. Je n'aime pas le poisson. Je suis sans lactose..."
              value={tempPrefs}
              onChange={e => setTempPrefs(e.target.value)}
            />
            <button
              onClick={sauvegarderPreferences}
              className="bg-black text-white rounded-lg px-4 py-2 text-sm"
            >
              Sauvegarder
            </button>
          </div>
        )}
      </div>

      {/* Suggestions IA */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
          <div>
            <div className="font-medium">Suggestions personnalisées</div>
            <div className="text-xs text-gray-400 mt-1">
              Basées sur tes macros restantes{preferences ? ' et tes préférences' : ''}
            </div>
          </div>
          <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">IA</span>
        </div>

        <div className="px-6 py-4">
          {!suggestions && !loading && (
            <div className="text-center py-6">
              <div className="text-sm text-gray-400 mb-4">
                {kcalRestant > 0
                  ? `Il te reste ${kcalRestant} kcal — l'IA va suggérer quoi manger`
                  : 'Tu as atteint ton objectif calorique 🎉'
                }
              </div>
              <button
                onClick={genererSuggestions}
                className="bg-black text-white rounded-lg px-6 py-2 text-sm"
              >
                Générer mes suggestions ✨
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-6 text-sm text-gray-400">
              L'IA analyse tes besoins...
            </div>
          )}

          {suggestions && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {suggestions.map((s, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="font-medium text-sm mb-1">{s.nom}</div>
                    <div className="text-xs text-gray-400 mb-3">{s.description}</div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      <span className="font-medium text-sm">{s.kcal} kcal</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">P {s.proteines}g</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">G {s.glucides}g</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">L {s.lipides}g</span>
                    </div>
                    <div className="mb-3">
                      {s.ingredients?.map((ing, j) => (
                        <div key={j} className="text-xs text-gray-500">· {ing}</div>
                      ))}
                    </div>
                    <div className="text-xs text-purple-600 bg-purple-50 rounded-lg p-2 italic">
                      {s.raison}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={genererSuggestions}
                className="text-xs text-gray-400 underline"
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