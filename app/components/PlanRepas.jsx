'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const REPAS_TYPES = [
  { id: 'petitDejeuner', label: 'Petit-déj', emoji: '🌅' },
  { id: 'dejeuner', label: 'Déjeuner', emoji: '☀️' },
  { id: 'diner', label: 'Dîner', emoji: '🌙' },
]

function getLundiSemaine() {
  const now = new Date()
  const lundi = new Date(now)
  lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return lundi.toISOString().split('T')[0]
}

export default function PlanRepas({ objectifs, poids, composition }) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showCourses, setShowCourses] = useState(false)
  const [config, setConfig] = useState(
    JOURS_SEMAINE.map(jour => ({
      nom: jour,
      actif: true,
      repas: Object.fromEntries(REPAS_TYPES.map(r => [r.id, { actif: true, portions: 1, restes: false }]))
    }))
  )

  const semaine = getLundiSemaine()

  useEffect(() => { fetchPlan() }, [])

  async function fetchPlan() {
    setLoading(true)
    const { data } = await supabase.from('meal_plans').select('*').eq('semaine', semaine).maybeSingle()
    if (data) setPlan(data)
    setLoading(false)
  }

  function updateConfig(jourIdx, repasId, field, value) {
    setConfig(prev => prev.map((j, i) => i !== jourIdx ? j : {
      ...j,
      repas: { ...j.repas, [repasId]: { ...j.repas[repasId], [field]: value } }
    }))
  }

  function toggleJour(jourIdx, actif) {
    setConfig(prev => prev.map((j, i) => i !== jourIdx ? j : {
      ...j,
      actif,
      repas: Object.fromEntries(
        REPAS_TYPES.map(r => [r.id, { ...j.repas[r.id], actif }])
      )
    }))
  }

  async function generer() {
    if (plan && !confirm('Un plan existe déjà pour cette semaine. Regénérer ?')) return
    setGenerating(true)
    const joursActifs = config.filter(j => j.actif === true && REPAS_TYPES.some(r => j.repas[r.id].actif))
    console.log('Jours envoyés:', joursActifs.map(j => j.nom))
    try {
      const res = await fetch('/api/plan-repas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectifs,
          poids: poids?.[0]?.valeur || 82,
          composition: composition?.[0],
          semaine,
          jours: config
            .filter(j => j.actif === true && REPAS_TYPES.some(r => j.repas[r.id].actif))
            .map(j => ({
              nom: j.nom,
              repas: Object.fromEntries(
                REPAS_TYPES
                  .filter(r => j.repas[r.id].actif)
                  .map(r => [r.id, {
                    label: r.label,
                    portions: j.repas[r.id].portions + (j.repas[r.id].restes ? 1 : 0),
                    portionsBase: j.repas[r.id].portions,
                    restes: j.repas[r.id].restes,
                  }])
              )
            }))
        })
      })
      const result = await res.json()
      if (result.jours) {
        setPlan({ plan: result.jours, liste_courses: result.listeCourses })
        setShowConfig(false)
      }
    } catch(e) { console.error(e) }
    setGenerating(false)
  }

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-400">
      Chargement du plan...
    </div>
  )

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">Planificateur repas IA</div>
            <div className="text-xs text-gray-400 mt-1">
              Semaine du {new Date(semaine).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div className="flex gap-2">
            {plan && (
              <button onClick={() => setShowCourses(!showCourses)} className="text-sm border border-gray-200 rounded-lg px-4 py-1.5 hover:bg-gray-50">
                🛒 Courses
              </button>
            )}
            <button onClick={() => setShowConfig(!showConfig)} className="text-sm border border-gray-200 rounded-lg px-4 py-1.5 hover:bg-gray-50">
              {showConfig ? 'Annuler' : plan ? '↺ Regénérer' : '✨ Planifier'}
            </button>
          </div>
        </div>
      </div>

      {/* Config — cartes par jour */}
      {showConfig && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="font-medium mb-2">Configure ta semaine</div>
          <div className="text-xs text-gray-400 mb-4">Active les repas, ajuste les portions et coche ♻️ si tu veux des restes (+1 portion)</div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {config.map((jour, jourIdx) => (
              <div key={jour.nom} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-700">{jour.nom.slice(0, 3)}</span>
                  <input
                    type="checkbox"
                    checked={jour.actif !== false}
                    onChange={e => toggleJour(jourIdx, e.target.checked)}
                    className="w-3 h-3"
                  />
                </div>
                {REPAS_TYPES.map(r => {
                  const repas = jour.repas[r.id]
                  return (
                    <div key={r.id} className={`mb-3 p-2 rounded-lg border transition-all ${repas.actif ? 'bg-white border-gray-200' : 'bg-gray-100 border-transparent opacity-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">{r.emoji}</span>
                        <button
                          onClick={() => updateConfig(jourIdx, r.id, 'actif', !repas.actif)}
                          className={`w-5 h-5 rounded-full text-xs flex items-center justify-center transition-all ${repas.actif ? 'bg-black text-white' : 'bg-gray-300 text-gray-500'}`}
                        >
                          {repas.actif ? '✓' : '×'}
                        </button>
                      </div>
                      {repas.actif && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <button onClick={() => updateConfig(jourIdx, r.id, 'portions', Math.max(1, repas.portions - 1))} className="w-5 h-5 bg-gray-100 rounded text-xs flex items-center justify-center">−</button>
                            <span className="text-xs font-medium">{repas.portions}</span>
                            <button onClick={() => updateConfig(jourIdx, r.id, 'portions', Math.min(10, repas.portions + 1))} className="w-5 h-5 bg-gray-100 rounded text-xs flex items-center justify-center">+</button>
                          </div>
                          {r.id === 'diner' && (
                            <button
                              onClick={() => updateConfig(jourIdx, r.id, 'restes', !repas.restes)}
                              className={`w-full text-xs py-0.5 rounded transition-all ${repas.restes ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}
                            >
                              ♻️ restes
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <button
            onClick={generer}
            disabled={generating}
            className="w-full bg-black text-white rounded-lg py-2.5 text-sm disabled:opacity-40"
          >
            {generating ? "L'IA compose ta semaine..." : 'Générer mon plan ✨'}
          </button>
        </div>
      )}

      {/* Liste de courses */}
      {showCourses && plan?.liste_courses && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="font-medium mb-4">🛒 Liste de courses</div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(plan.liste_courses).map(([categorie, items]) => (
              <div key={categorie}>
                <div className="text-xs font-medium text-gray-500 mb-2">{categorie}</div>
                {items.map((item, i) => (
                  <div key={i} className="text-xs text-gray-600 mb-1">· {item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan affiché */}
      {plan?.plan && !showConfig && (
        <div className="flex flex-col gap-3">
          {plan.plan.map((jour, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50">
                <div className="font-medium text-sm">{jour.nom}</div>
                <div className="text-xs text-gray-400">
                  {[jour.petitDejeuner, jour.dejeuner, jour.diner].filter(Boolean).reduce((s, r) => s + (r.kcal || 0), 0)} kcal
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { key: 'petitDejeuner', label: 'Petit-déj', emoji: '🌅' },
                  { key: 'dejeuner', label: 'Déjeuner', emoji: '☀️' },
                  { key: 'diner', label: 'Dîner', emoji: '🌙' },
                ].map(({ key, label, emoji }) => {
                  const repas = jour[key]
                  if (!repas) return null
                  return (
                    <div key={key} className="px-6 py-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <span className="text-xs text-gray-400 mr-2">{emoji} {label}</span>
                          <span className="text-sm font-medium text-gray-800">{repas.nom}</span>
                          {repas.restesNote && (
                            <div className="mt-1">
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">♻️ {repas.restesNote}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2">{repas.kcal} kcal</span>
                      </div>
                      <div className="flex gap-3 text-xs mb-1">
                        <span className="text-blue-500">P {repas.proteines}g</span>
                        <span className="text-amber-500">G {repas.glucides}g</span>
                        <span className="text-green-500">L {repas.lipides}g</span>
                      </div>
                      <div className="text-xs text-gray-400">{repas.ingredients?.join(' · ')}</div>
                    </div>
                  )
                })}
              {jour.suggestionProteines && (
                <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">💪</span>
                    <span className="text-xs text-blue-700">{jour.suggestionProteines}</span>
                  </div>
                </div>
              )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* État vide */}
      {!plan && !showConfig && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-3xl mb-3">🍽️</div>
          <div className="font-medium text-gray-700 mb-2">Aucun plan cette semaine</div>
          <div className="text-sm text-gray-400 mb-6">L'IA compose ta semaine selon tes objectifs et tes aliments préférés</div>
          <button onClick={() => setShowConfig(true)} className="bg-black text-white rounded-lg px-6 py-2.5 text-sm">
            Planifier ma semaine ✨
          </button>
        </div>
      )}
    </div>
  )
}