'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import ImportGPX from './ImportGPX'

const EXERCICES_LIST = [
  'Pompes', 'Tractions', 'Dips', 'Squat', 'Fentes', 'Burpees',
  'Crunchs', 'Mountain climbers', 'Jumping jacks', 'Dips chaise',
  'Hip thrust', 'Relevés de jambes', 'Superman', 'Pistol squat',
  'Gainage', 'Gainage côté droit', 'Gainage côté gauche', 'Glute bridge'
]

const EXERCICES_SECONDES = ['Gainage', 'Gainage côté droit', 'Gainage côté gauche']

const TYPES = [
  { value: 'course', label: 'Course', bg: '#dceeff', text: '#185fa5' },
  { value: 'renforcement', label: 'Renforcement', bg: '#efeaff', text: '#6b4fd6' },
  { value: 'autre', label: 'Autre', bg: '#ece5dd', text: '#8a807a' },
]

export default function Sport({ seances, onRefresh, poids, pas, budget }) {
  const [showLogger, setShowLogger] = useState(false)
  const [type, setType] = useState('course')
  const [nom, setNom] = useState('')
  const [duree, setDuree] = useState(30)
  const [distance, setDistance] = useState('')
  const [allureMin, setAllureMin] = useState('')
  const [allureSec, setAllureSec] = useState('')
  const [kcalManuelles, setKcalManuelles] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [groupes, setGroupes] = useState([])
  const [exercices, setExercices] = useState([{ nom: '', series: '', reps: '' }])
  const [analyse, setAnalyse] = useState(null)
  const [analyseLoading, setAnalyseLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  const seancesSemaine = seances?.filter(s => {
    const d = new Date(s.date)
    const diff = (new Date() - d) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }) || []

  const totalMin = seancesSemaine.reduce((s, r) => s + r.duree, 0)
  const objectifMin = 250
  const pctSemaine = Math.min(100, Math.round(totalMin / objectifMin * 100))
  const groupesMusculaires = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Abdos', 'Jambes', 'Fessiers']

  function toggleGroupe(g) {
    setGroupes(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  function addExercice() {
    setExercices(prev => [...prev, { nom: '', series: '', reps: '' }])
  }

  function removeExercice(i) {
    setExercices(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateExercice(i, field, value) {
    setExercices(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
    setAnalyse(null)
  }

  async function analyserSeance() {
    setAnalyseLoading(true)
    try {
      const res = await fetch('/api/calories-renfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercices,
          duree,
          poids: poids?.[0]?.valeur || 82,
          groupes
        })
      })
      const data = await res.json()
      if (data.kcal) {
        setAnalyse(data)
        setKcalManuelles(String(data.kcal))
        if (data.groupes?.length > 0) {
          setGroupes(data.groupes)
        }
      }
    } catch(e) {
      console.error(e)
    }
    setAnalyseLoading(false)
  }

  async function ajouterSeance() {
    if (!nom) return
    setLoading(true)
    let kcal = kcalManuelles ? Number(kcalManuelles) : type === 'course' ? Math.round(duree * 9) : Math.round(duree * 5)
    let notes = null
    if (type === 'course' && allureMin) {
      notes = `Allure: ${allureMin}'${String(allureSec || 0).padStart(2, '0')}/km`
    } else if (type === 'renforcement') {
      const exLog = exercices.filter(e => e.nom).map(e => `${e.nom}${e.series ? ` ${e.series}x${e.reps}` : ''}`).join(' · ')
      const groupesLog = groupes.length > 0 ? groupes.join(', ') : ''
      const zoneLog = analyse?.zone ? `Zone: ${analyse.zone}` : ''
      notes = [groupesLog, exLog, zoneLog].filter(Boolean).join(' | ')
    }
    await supabase.from('seances').insert({
      date, type, nom, duree: Number(duree), kcal,
      distance: distance ? Number(distance) : 0,
      notes,
    })
    setNom('')
    setDuree(30)
    setDistance('')
    setAllureMin('')
    setAllureSec('')
    setKcalManuelles('')
    setGroupes([])
    setExercices([{ nom: '', series: '', reps: '' }])
    setAnalyse(null)
    setDate(new Date().toISOString().split('T')[0])
    setLoading(false)
    setShowLogger(false)
    onRefresh()
  }

  async function supprimerSeance(id) {
    await supabase.from('seances').delete().eq('id', id)
    onRefresh()
  }

  const exercicesRemplis = exercices.some(e => e.nom.trim() !== '')

  const today = new Date().toISOString().split('T')[0]
  const pasAujourdhui = pas?.find(p => p.date === today)

  const typeInfo = (t) => TYPES.find(x => x.value === t) || TYPES[2]

  return (
    <div className="flex flex-col gap-[22px]">

      {/* Activité du jour — dépense énergétique cohérente avec le Health Engine
          (TMB + pas + sport du jour), pas les calories Withings brutes qui
          peuvent être peu fiables sans tracker d'activité dédié */}
      <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[18px] font-extrabold text-[#2a1a12]">Activité du jour</div>
            <div className="text-[13px] text-[#8a807a] mt-0.5">Dépense énergétique totale</div>
          </div>
          <span className="text-xs font-bold text-[#b0a8a2]">Withings</span>
        </div>

        {/* Total mis en avant */}
        <div className="rounded-2xl bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] p-5 mb-4 text-center">
          <div className="text-3xl font-extrabold text-white">{(budget?.depenseTotal || 0).toLocaleString('fr-FR')}</div>
          <div className="text-xs text-white/70 font-semibold mt-1">kcal dépensées aujourd'hui (TMB + effet thermique + pas + sport)</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#dceeff] rounded-2xl p-3 md:p-4 text-center">
            <div className="text-base md:text-xl font-extrabold text-[#185fa5]">{(pasAujourdhui?.nb_pas || 0).toLocaleString('fr-FR')}</div>
            <div className="text-xs text-[#378ADD] font-semibold mt-1">👟 pas</div>
          </div>
          <div className="bg-[#f9f6f3] rounded-2xl p-3 md:p-4 text-center">
            <div className="text-base md:text-xl font-extrabold text-[#2a1a12]">{budget?.tmb || 0}</div>
            <div className="text-xs text-[#8a807a] font-semibold mt-1">⚙️ TMB</div>
          </div>
          <div className="bg-[#fff3ea] rounded-2xl p-3 md:p-4 text-center">
            <div className="text-base md:text-xl font-extrabold text-[#c2876b]">{budget?.kcalPas || 0}</div>
            <div className="text-xs text-[#ff8a3d] font-semibold mt-1">🔥 kcal pas</div>
          </div>
          <div className="bg-[#efeaff] rounded-2xl p-3 md:p-4 text-center">
            <div className="text-base md:text-xl font-extrabold text-[#6b4fd6]">{budget?.kcalSport || 0}</div>
            <div className="text-xs text-[#7c5cff] font-semibold mt-1">💪 kcal sport</div>
          </div>
        </div>
        <div className="text-[11px] text-[#b0a8a2] text-center mt-3">
          + effet thermique des aliments (~{Math.round((budget?.tmb || 0) * 0.1)} kcal) inclus dans le total
        </div>
      </div>

      {/* Cette semaine */}
      <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Cette semaine</div>
          <button
            onClick={() => setShowLogger(true)}
            className="text-[13px] font-bold bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-full px-5 py-2.5 shadow-[0_8px_18px_-8px_rgba(255,107,74,0.6)] hover:shadow-[0_8px_18px_-8px_rgba(255,107,74,0.8)] transition-all"
          >
            + Ajouter une séance
          </button>
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-xs font-semibold text-[#8a807a] mb-1.5">
            <span>Activité hebdo</span>
            <span>{totalMin} / {objectifMin} min</span>
          </div>
          <div className="h-2.5 bg-[#f3eee9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] to-[#a78bff] transition-all duration-500"
              style={{ width: pctSemaine + '%' }}
            />
          </div>
        </div>

        {seancesSemaine.length === 0 ? (
          <div className="text-sm text-[#b0a8a2] text-center py-6">Aucune séance cette semaine</div>
        ) : (
          <div className="flex flex-col gap-2">
            {seancesSemaine.map(s => {
              const ti = typeInfo(s.type)
              return (
                <div key={s.id} className="flex justify-between items-center py-3 px-4 bg-[#f9f6f3] rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: ti.bg, color: ti.text }}>
                      {ti.label}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#2a1a12] truncate">{s.nom}</div>
                      <div className="text-xs text-[#b0a8a2] mt-0.5">
                        {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{s.duree} min
                        {s.distance > 0 && <> · {s.distance} km</>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-extrabold text-[#2a1a12]">{s.kcal} kcal</span>
                    <button onClick={() => supprimerSeance(s.id)} className="text-[#d8cfc8] hover:text-[#e2553f] text-sm transition-colors">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal d'ajout de séance */}
      {showLogger && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setShowLogger(false)}
        >
          <div
            className="bg-white rounded-[26px] shadow-2xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-7 py-5 border-b border-[#f3eee9]">
              <span className="text-[18px] font-extrabold text-[#2a1a12]">Ajouter une séance</span>
              <button onClick={() => setShowLogger(false)} className="text-[#b0a8a2] hover:text-[#2a1a12] text-xl leading-none transition-colors">✕</button>
            </div>

            <div className="px-7 py-6">
              <div className="flex gap-2 mb-4">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setType(t.value); setGroupes([]); setAnalyse(null) }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={type === t.value ? { background: t.bg, color: t.text } : { background: '#f9f6f3', color: '#8a807a' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  autoFocus
                  className="flex-1 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                  placeholder="Nom de la séance..."
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                />
                <input
                  type="date"
                  className="border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm flex-shrink-0"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2 flex-wrap mb-3 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#b0a8a2]">Durée</label>
                  <input
                    type="number"
                    className="w-24 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                    placeholder="min"
                    value={duree}
                    onChange={e => setDuree(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#b0a8a2]">Kcal (optionnel)</label>
                  <input
                    type="number"
                    className="w-32 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                    placeholder="auto si vide"
                    value={kcalManuelles}
                    onChange={e => setKcalManuelles(e.target.value)}
                  />
                </div>
                {type === 'course' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#b0a8a2]">Distance</label>
                      <input
                        type="number"
                        className="w-24 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                        placeholder="km"
                        value={distance}
                        onChange={e => setDistance(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#b0a8a2]">Allure /km</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="w-16 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                          placeholder="min"
                          value={allureMin}
                          onChange={e => setAllureMin(e.target.value)}
                        />
                        <span className="text-[#b0a8a2] text-sm">'</span>
                        <input
                          type="number"
                          className="w-16 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                          placeholder="sec"
                          value={allureSec}
                          onChange={e => setAllureSec(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {type === 'renforcement' && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-[#8a807a] mb-2 mt-3">Groupes musculaires</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {groupesMusculaires.map(g => (
                      <button
                        key={g}
                        onClick={() => toggleGroupe(g)}
                        className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                        style={groupes.includes(g) ? { background: '#efeaff', color: '#6b4fd6' } : { background: '#f9f6f3', color: '#8a807a' }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs font-semibold text-[#8a807a] mb-2">Exercices</div>
                  {exercices.map((ex, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <select
                        className="flex-1 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                        value={ex.nom}
                        onChange={e => updateExercice(i, 'nom', e.target.value)}
                      >
                        <option value="">Sélectionner...</option>
                        {EXERCICES_LIST.map(e => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="w-16 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                        placeholder="séries"
                        value={ex.series}
                        onChange={e => updateExercice(i, 'series', e.target.value)}
                      />
                      <span className="text-[#b0a8a2] text-xs">×</span>
                      <input
                        type="number"
                        className="w-16 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"
                        placeholder={EXERCICES_SECONDES.includes(ex.nom) ? 'sec' : 'reps'}
                        value={ex.reps}
                        onChange={e => updateExercice(i, 'reps', e.target.value)}
                      />
                      {exercices.length > 1 && (
                        <button onClick={() => removeExercice(i)} className="text-[#d8cfc8] hover:text-[#e2553f] text-xs transition-colors">✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addExercice} className="text-xs font-bold text-[#7c5cff] mt-1 mb-4">+ Ajouter un exercice</button>

                  {exercicesRemplis && (
                    <div className="mt-3">
                      <button
                        onClick={analyserSeance}
                        disabled={analyseLoading}
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-40"
                        style={{ background: '#efeaff', color: '#6b4fd6' }}
                      >
                        {analyseLoading ? 'Analyse en cours...' : 'Analyser ma séance ✨'}
                      </button>

                      {analyse && (
                        <div className="mt-3 rounded-2xl p-4" style={{ background: '#efeaff' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold" style={{ color: '#6b4fd6' }}>{analyse.kcal} kcal estimées</span>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white" style={{ color: '#6b4fd6' }}>{analyse.zone}</span>
                          </div>
                          <div className="text-xs" style={{ color: '#6b4fd6' }}>{analyse.explication}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 mb-3">
                <ImportGPX onRefresh={onRefresh} poids={poids?.[0]?.valeur} />
              </div>

              <button
                onClick={ajouterSeance}
                disabled={loading || !nom}
                className="w-full bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl px-4 py-3 text-sm font-bold shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)] disabled:opacity-40"
              >
                {loading ? '...' : '+ Ajouter la séance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}