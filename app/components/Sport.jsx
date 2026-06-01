'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Sport({ seances, onRefresh }) {
  const [type, setType] = useState('course')
  const [nom, setNom] = useState('')
  const [duree, setDuree] = useState(30)
  const [distance, setDistance] = useState('')
  const [kcalManuelles, setKcalManuelles] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [groupes, setGroupes] = useState([])
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

  async function ajouterSeance() {
    if (!nom) return
    setLoading(true)
    let kcal = kcalManuelles ? Number(kcalManuelles) : type === 'course' ? Math.round(duree * 9) : Math.round(duree * 5)
    await supabase.from('seances').insert({
      date,
      type,
      nom,
      duree: Number(duree),
      kcal,
      distance: distance ? Number(distance) : 0,
      notes: groupes.length > 0 ? groupes.join(', ') : null,
    })
    setNom('')
    setDuree(30)
    setDistance('')
    setKcalManuelles('')
    setGroupes([])
    setDate(new Date().toISOString().split('T')[0])
    setLoading(false)
    onRefresh()
  }

  async function supprimerSeance(id) {
    await supabase.from('seances').delete().eq('id', id)
    onRefresh()
  }

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
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={type} onChange={e => { setType(e.target.value); setGroupes([]) }}>
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

        <div className="flex gap-2 flex-wrap mb-3">
          <input
            type="number"
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="min"
            value={duree}
            onChange={e => setDuree(e.target.value)}
          />
          {type === 'course' && (
            <input
              type="number"
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="km"
              value={distance}
              onChange={e => setDistance(e.target.value)}
            />
          )}
          <input
            type="number"
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="kcal brûlées"
            value={kcalManuelles}
            onChange={e => setKcalManuelles(e.target.value)}
          />
        </div>

        {type === 'renforcement' && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-2">Groupes musculaires travaillés</div>
            <div className="flex flex-wrap gap-2">
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
          </div>
        )}

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