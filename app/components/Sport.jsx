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

export default function Sport({ seances, onRefresh, poids }) {
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
  const totalKcal = seancesSemaine.reduce((s, r) => s + (r.kcal || 0), 0)
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
    onRefresh()
  }

  async function supprimerSeance(id) {
    await supabase.from('seances').delete().eq('id', id)
    onRefresh()
  }

  const exercicesRemplis = exercices.some(e => e.nom.trim() !== '')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Sport cette semaine</div>
          <div className="text-xs text-gray-400">{totalMin} min · {totalKcal} kcal brûlées</div>
        </div>
        <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
          {seancesSemaine.length} séances
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Activité hebdo</span>
          <span>{totalMin} / 250 min</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded">
          <div className="h-1.5 bg-purple-400 rounded transition-all" style={{ width: Math.min(100, Math.round(totalMin / 250 * 100)) + '%' }} />
        </div>
      </div>

      <div className="border-t border-gray-50 pt-4 mb-4">
        {seancesSemaine.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">Aucune séance cette semaine</div>
        ) : (
          seancesSemaine.map(s => (
            <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <span className="text-sm">{s.nom}</span>
                <span className="text-xs text-gray-400 ml-2">{s.duree} min</span>
                {s.distance > 0 && <span className="text-xs text-gray-400 ml-1">· {s.distance} km</span>}
                {s.notes && <span className="text-xs text-purple-400 ml-1">· {s.notes}</span>}
                <div className="text-xs text-gray-300">{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{s.kcal} kcal</span>
                <button onClick={() => supprimerSeance(s.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-50 pt-4">
        <div className="text-xs text-gray-400 mb-3">Ajouter une séance</div>

        <div className="flex gap-2 flex-wrap mb-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={type} onChange={e => { setType(e.target.value); setGroupes([]); setAnalyse(null) }}>
            <option value="course">Course</option>
            <option value="renforcement">Renforcement</option>
            <option value="autre">Autre</option>
          </select>
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Nom de la séance..."
            value={nom}
            onChange={e => setNom(e.target.value)}
          />
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap mb-3 items-center">
          <input
            type="number"
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="min"
            value={duree}
            onChange={e => setDuree(e.target.value)}
          />
          <input
            type="number"
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="kcal brûlées"
            value={kcalManuelles}
            onChange={e => setKcalManuelles(e.target.value)}
          />
          {type === 'course' && (
            <>
              <input
                type="number"
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="km"
                value={distance}
                onChange={e => setDistance(e.target.value)}
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="min"
                  value={allureMin}
                  onChange={e => setAllureMin(e.target.value)}
                />
                <span className="text-gray-400 text-sm">'</span>
                <input
                  type="number"
                  className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="sec"
                  value={allureSec}
                  onChange={e => setAllureSec(e.target.value)}
                />
                <span className="text-xs text-gray-400">/km</span>
              </div>
            </>
          )}
        </div>

        {type === 'renforcement' && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-2">Groupes musculaires</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {groupesMusculaires.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGroupe(g)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${groupes.includes(g) ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-gray-200 text-gray-400'}`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-400 mb-2">Exercices</div>
            {exercices.map((ex, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <select
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
  className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm"
  placeholder="séries"
  value={ex.series}
  onChange={e => updateExercice(i, 'series', e.target.value)}
/>
<span className="text-gray-400 text-xs">×</span>
<input
  type="number"
  className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm"
  placeholder={EXERCICES_SECONDES.includes(ex.nom) ? 'sec' : 'reps'}
  value={ex.reps}
  onChange={e => updateExercice(i, 'reps', e.target.value)}
/>
{EXERCICES_SECONDES.includes(ex.nom) && (
  <span className="text-xs text-gray-400">sec</span>
)}
                {exercices.length > 1 && (
                  <button onClick={() => removeExercice(i)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                )}
              </div>
            ))}
            <button onClick={addExercice} className="text-xs text-purple-500 mt-1 mb-4">+ Ajouter un exercice</button>

            {exercicesRemplis && (
              <div className="mt-3">
                <button
                  onClick={analyserSeance}
                  disabled={analyseLoading}
                  className="w-full border border-purple-200 text-purple-700 rounded-lg px-4 py-2 text-sm bg-purple-50 hover:bg-purple-100 transition-all disabled:opacity-40"
                >
                  {analyseLoading ? 'Analyse en cours...' : 'Analyser ma séance ✨'}
                </button>

                {analyse && (
                  <div className="mt-3 bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-800">{analyse.kcal} kcal estimées</span>
                      <span className="text-xs bg-purple-200 text-purple-800 px-3 py-1 rounded-full">{analyse.zone}</span>
                    </div>
                    <div className="text-xs text-purple-600">{analyse.explication}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <ImportGPX onRefresh={onRefresh} poids={poids?.[0]?.valeur} />

        <button
          onClick={ajouterSeance}
          disabled={loading || !nom}
          className="w-full bg-black text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40"
        >
          {loading ? '...' : '+ Ajouter la séance'}
        </button>
      </div>
    </div>
  )
}