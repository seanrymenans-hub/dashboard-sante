'use client'
import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'

const PERIODES = [
  { label: '1 mois', jours: 30 },
  { label: '3 mois', jours: 90 },
  { label: '6 mois', jours: 180 },
  { label: '1 an', jours: 365 },
]

function parseAllure(notes) {
  if (!notes) return null
  const match = notes.match(/Allure:\s*(\d+)'(\d+)\/km/)
  if (!match) return null
  return parseInt(match[1]) + parseInt(match[2]) / 60
}

function formatAllure(decimal) {
  if (!decimal) return '—'
  const min = Math.floor(decimal)
  const sec = Math.round((decimal - min) * 60)
  return `${min}'${String(sec).padStart(2, '0')}/km`
}

export default function CourseAnalyse({ seances, repas, objectifs, onRefresh }) {
  const [periode, setPeriode] = useState(90)
  const [analyseIA, setAnalyseIA] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [showGraphiques, setShowGraphiques] = useState(false)

  const courses = useMemo(() => {
    return seances
      .filter(s => {
        const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
        return s.type === 'course' && diff <= periode
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => ({
        ...s,
        allureDecimal: parseAllure(s.notes),
        allureStr: parseAllure(s.notes) ? formatAllure(parseAllure(s.notes)) : '—',
        distanceNum: parseFloat(s.distance) || 0,
        dateLabel: new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      }))
  }, [seances, periode])

  const stats = useMemo(() => {
    if (courses.length === 0) return null
    const distanceTotal = Math.round(courses.reduce((s, c) => s + c.distanceNum, 0) * 10) / 10
    const allures = courses.filter(c => c.allureDecimal)
    const allureMoy = allures.length > 0
      ? formatAllure(allures.reduce((s, c) => s + c.allureDecimal, 0) / allures.length)
      : '—'
    const meilleureAllure = allures.length > 0
      ? formatAllure(Math.min(...allures.map(c => c.allureDecimal)))
      : '—'
    return { nb: courses.length, distanceTotal, allureMoy, meilleureAllure }
  }, [courses])
async function supprimerCourse(id) {
    if (!confirm('Supprimer cette course ?')) return
    await supabase.from('seances').delete().eq('id', id)
    onRefresh()
  }
  async function analyser() {
    setLoadingIA(true)
    try {
      const repasperiode = repas.filter(r => {
        const diff = (new Date().getTime() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24)
        return diff <= periode
      })
      const res = await fetch('/api/analyse-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses, repas: repasperiode, objectifs, periode })
      })
      const data = await res.json()
      if (data.analyse) setAnalyseIA(data)
    } catch(e) { console.error(e) }
    setLoadingIA(false)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Filtre période */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="font-medium">Analyse course</div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODES.map(p => (
              <button
                key={p.jours}
                onClick={() => { setPeriode(p.jours); setAnalyseIA(null); setShowGraphiques(false) }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${periode === p.jours ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.nb}</div>
              <div className="text-xs text-blue-500 mt-1">courses</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.distanceTotal}</div>
              <div className="text-xs text-green-500 mt-1">km total</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-amber-700">{stats.allureMoy}</div>
              <div className="text-xs text-amber-500 mt-1">allure moy.</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-purple-700">{stats.meilleureAllure}</div>
              <div className="text-xs text-purple-500 mt-1">meilleure allure</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-400 py-4">Aucune course sur cette période</div>
        )}
      </div>

      {courses.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <button
              onClick={() => setShowGraphiques(!showGraphiques)}
              className="w-full flex justify-between items-center text-sm font-medium"
            >
              <span>📈 Graphiques</span>
              <span className="text-gray-400">{showGraphiques ? '−' : '+'}</span>
            </button>
          </div>

          {showGraphiques && (
            <div className="flex flex-col gap-4">
            {/* Graphique allure */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="font-medium mb-4">Évolution de l'allure</div>
            <div className="text-xs text-gray-400 mb-3">Plus bas = plus rapide</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={courses.filter(c => c.allureDecimal)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                <YAxis
                  reversed
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatAllure}
                />
                <Tooltip formatter={(val) => [formatAllure(val), 'Allure']} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="allureDecimal" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique distance */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="font-medium mb-4">Distance par course</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={courses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" km" />
                <Tooltip formatter={(val) => [`${val} km`, 'Distance']} />
                <Bar dataKey="distanceNum" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
          )}

          {/* Liste courses */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 font-medium">Détail des courses</div>
            <div className="divide-y divide-gray-50">
              {[...courses].reverse().map(c => (
                <div key={c.id} className="px-6 py-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{c.nom}</div>
                    <div className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-600 items-center">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{c.distanceNum} km</span>
                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full">{c.allureStr}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{c.duree} min</span>
                    <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{c.kcal} kcal</span>
                    <button onClick={() => supprimerCourse(c.id)} className="text-gray-300 hover:text-red-400 ml-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coach IA */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
              <div>
                <div className="font-medium">Analyse IA de mes performances</div>
                <div className="text-xs text-gray-400 mt-1">Basée sur tes courses et ton alimentation</div>
              </div>
              <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">IA</span>
            </div>
            <div className="px-6 py-4">
              {!analyseIA && (
                <div className="text-center py-4">
                  <button onClick={analyser} disabled={loadingIA} className="bg-black text-white rounded-lg px-6 py-2 text-sm disabled:opacity-40">
                    {loadingIA ? 'Analyse en cours...' : 'Analyser mes performances ✨'}
                  </button>
                </div>
              )}
              {analyseIA && (
                <div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-3 text-sm text-gray-700 leading-relaxed">{analyseIA.analyse}</div>
                  {analyseIA.points?.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <span className={`text-xs mt-1 ${p.positif ? 'text-green-600' : 'text-amber-600'}`}>{p.positif ? '✓' : '→'}</span>
                      <span className="text-sm text-gray-600">{p.texte}</span>
                    </div>
                  ))}
                  <button onClick={() => setAnalyseIA(null)} className="text-xs text-gray-400 underline mt-2">Regénérer</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}