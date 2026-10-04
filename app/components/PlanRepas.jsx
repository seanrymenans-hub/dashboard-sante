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
  return `${lundi.getFullYear()}-${String(lundi.getMonth() + 1).padStart(2, '0')}-${String(lundi.getDate()).padStart(2, '0')}`
}

export default function PlanRepas({ objectifs, poids, composition, planCache, onPlanUpdate, macros }) {
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
    const { data, error } = await supabase.from('meal_plans').select('*').eq('semaine', semaine).maybeSingle()
    if (error) console.error('fetchPlan error:', error)
    if (planCache) {
      setPlan(planCache)
    } else if (data) {
      const parsed = {
        ...data,
        plan: typeof data.plan === 'string' ? JSON.parse(data.plan) : data.plan,
        liste_courses: typeof data.liste_courses === 'string' ? JSON.parse(data.liste_courses) : data.liste_courses,
      }
      setPlan(parsed)
      onPlanUpdate?.(parsed)
    }
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
          macros,
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
        const newPlan = { plan: result.jours, liste_courses: result.listeCourses }
        setPlan(newPlan)
        onPlanUpdate?.(newPlan)
        setShowConfig(false)
      }
    } catch(e) { console.error(e) }
    setGenerating(false)
  }

  if (loading) return (
    <div className="rounded-[26px] bg-white p-8 text-center text-sm text-[#b0a8a2] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      Chargement du plan...
    </div>
  )

  return (
    <div className="flex flex-col gap-[22px]">

      {/* Header + config — une seule carte continue */}
      <div className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="p-[26px_28px]">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[18px] font-extrabold text-[#2a1a12]">Planificateur repas IA</div>
              <div className="text-[13px] text-[#8a807a] mt-1">
                {plan
                  ? `Semaine du ${new Date(semaine).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                  : "L'IA compose 7 jours de repas selon tes macros et tes goûts"}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {plan && (
                <button onClick={() => setShowCourses(!showCourses)} className="text-[13px] font-semibold border border-[#f3eee9] rounded-xl px-4 py-2 text-[#2a1a12] hover:bg-[#fff3ea] transition-all">
                  🛒 Courses
                </button>
              )}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`text-[13px] font-bold rounded-xl px-4 py-2 transition-all ${
                  showConfig
                    ? 'border border-[#f3eee9] text-[#2a1a12] hover:bg-[#fff3ea]'
                    : 'bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)]'
                }`}
              >
                {showConfig ? 'Annuler' : plan ? '↺ Regénérer' : '✨ Planifier'}
              </button>
            </div>
          </div>

          {/* Aperçu de la semaine vide — uniquement avant la première génération et hors config */}
          {!plan && !showConfig && (
            <div className="grid grid-cols-7 gap-2 mt-6">
              {JOURS_SEMAINE.map(jour => (
                <div key={jour} className="bg-[#f9f6f3] rounded-xl py-3.5 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#b0a8a2]">{jour.slice(0, 3)}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e8e1da]" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Config — intégrée directement, pas de carte séparée */}
        {showConfig && (
          <div className="px-[28px] pb-[28px] pt-1 border-t border-[#f3eee9] mt-1">
            <div className="text-[13px] text-[#8a807a] my-5">Active les repas, ajuste les portions et coche ♻️ si tu veux des restes (+1 portion)</div>

            <div className="grid grid-cols-7 gap-3 mb-6">
              {config.map((jour, jourIdx) => (
                <div key={jour.nom} className={`rounded-2xl p-3 transition-all ${jour.actif !== false ? 'bg-[#f9f6f3]' : 'bg-[#f9f6f3] opacity-50'}`}>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#ece5dd]">
                    <span className="text-[13px] font-extrabold text-[#2a1a12]">{jour.nom.slice(0, 3)}</span>
                    <input
                      type="checkbox"
                      checked={jour.actif !== false}
                      onChange={e => toggleJour(jourIdx, e.target.checked)}
                      className="w-4 h-4 accent-[#ff6b4a]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {REPAS_TYPES.map(r => {
                      const repas = jour.repas[r.id]
                      const repasColors = {
                        petitDejeuner: { bg: '#faeeda', text: '#854f0b' },
                        dejeuner: { bg: '#dceeff', text: '#185fa5' },
                        diner: { bg: '#ece6ff', text: '#534ab7' },
                      }
                      const rc = repasColors[r.id]
                      return (
                        <div key={r.id} className="rounded-xl p-2.5" style={{ background: repas.actif ? rc.bg : '#f0ebe5' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: repas.actif ? rc.text : '#b0a8a2' }}>
                              {r.emoji} {r.label}
                            </span>
                            <button
                              onClick={() => updateConfig(jourIdx, r.id, 'actif', !repas.actif)}
                              className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-shrink-0"
                              style={{ background: repas.actif ? rc.text : '#d8cfc8', color: 'white' }}
                            >
                              {repas.actif ? '✓' : '×'}
                            </button>
                          </div>
                          {repas.actif && (
                            <div className="flex items-center justify-between mt-2">
                              <button onClick={() => updateConfig(jourIdx, r.id, 'portions', Math.max(1, repas.portions - 1))} className="w-5 h-5 bg-white/70 rounded text-xs flex items-center justify-center font-bold" style={{ color: rc.text }}>−</button>
                              <span className="text-xs font-extrabold" style={{ color: rc.text }}>{repas.portions}</span>
                              <button onClick={() => updateConfig(jourIdx, r.id, 'portions', Math.min(10, repas.portions + 1))} className="w-5 h-5 bg-white/70 rounded text-xs flex items-center justify-center font-bold" style={{ color: rc.text }}>+</button>
                            </div>
                          )}
                          {repas.actif && r.id === 'diner' && (
                            <button
                              onClick={() => updateConfig(jourIdx, r.id, 'restes', !repas.restes)}
                              className={`w-full text-[10px] py-1 rounded-lg font-bold mt-2 transition-all ${repas.restes ? 'bg-white text-[#854f0b]' : 'bg-white/50 text-[#b0a8a2]'}`}
                            >
                              ♻️ restes
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={generer}
              disabled={generating}
              className="w-full bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-40"
            >
              {generating ? "L'IA compose ta semaine..." : 'Générer mon plan ✨'}
            </button>
          </div>
        )}
      </div>

      {/* Liste de courses */}
      {showCourses && plan?.liste_courses && (
        <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
          <div className="text-[18px] font-extrabold text-[#2a1a12] mb-5">🛒 Liste de courses</div>
          <div className="grid grid-cols-2 gap-5">
            {Object.entries(plan.liste_courses).map(([categorie, items]) => (
              <div key={categorie}>
                <div className="text-xs font-bold text-[#c2876b] uppercase tracking-wide mb-2.5">{categorie}</div>
                {items.map((item, i) => (
                  <div key={i} className="text-[13px] text-[#5a4f48] mb-1.5">· {item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan affiché */}
      {plan?.plan && !showConfig && (
        <div className="flex flex-col gap-3.5">
          {plan.plan.map((jour, i) => (
            <div key={i} className="rounded-[22px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="px-6 py-3.5 flex justify-between items-center bg-[#fff3ea]">
                <div className="font-bold text-sm text-[#2a1a12]">{jour.nom}</div>
                <div className="text-xs font-semibold text-[#c2876b]">
                  {[jour.petitDejeuner, jour.dejeuner, jour.diner].filter(Boolean).reduce((s, r) => s + (r.kcal || 0), 0)} kcal
                </div>
              </div>
              <div className="divide-y divide-[#f6f1ec]">
                {[
                  { key: 'petitDejeuner', label: 'Petit-déj', emoji: '🌅' },
                  { key: 'dejeuner', label: 'Déjeuner', emoji: '☀️' },
                  { key: 'diner', label: 'Dîner', emoji: '🌙' },
                ].map(({ key, label, emoji }) => {
                  const repas = jour[key]
                  if (!repas) return null
                  return (
                    <div key={key} className="px-6 py-3.5">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex-1">
                          <span className="text-xs text-[#b0a8a2] mr-2">{emoji} {label}</span>
                          <span className="text-sm font-bold text-[#2a1a12]">{repas.nom}</span>
                          {repas.restesNote && (
                            <div className="mt-1.5">
                              <span className="text-xs font-semibold text-[#854f0b] bg-[#faeeda] px-2.5 py-1 rounded-full">♻️ {repas.restesNote}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#5a4f48] flex-shrink-0 ml-2">{repas.kcal} kcal</span>
                      </div>
                      <div className="flex gap-3 text-xs mb-1.5 font-semibold">
                        <span className="text-[#378ADD]">P {repas.proteines}g</span>
                        <span className="text-[#EF9F27]">G {repas.glucides}g</span>
                        <span className="text-[#16c79a]">L {repas.lipides}g</span>
                      </div>
                      <div className="text-xs text-[#b0a8a2]">{repas.ingredients?.join(' · ')}</div>
                    </div>
                  )
                })}
                {jour.suggestionProteines && (
                  <div className="px-6 py-3.5 bg-[#dceeff]">
                    <div className="flex items-center gap-2">
                      <span>💪</span>
                      <span className="text-xs font-semibold text-[#185fa5]">{jour.suggestionProteines}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}