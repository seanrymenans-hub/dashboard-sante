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

export default function CourseAnalyse({ seances, repas, objectifs, macros, onRefresh }) {
  const [periode, setPeriode] = useState(90)
  const [showGraphiques, setShowGraphiques] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)

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

  async function confirmerSuppression() {
    if (!aSupprimer) return
    await supabase.from('seances').delete().eq('id', aSupprimer)
    setASupprimer(null)
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-[22px]">

      {/* Filtre période + stats */}
      <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex justify-between items-center mb-5">
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Analyse course</div>
          <div className="flex gap-1 bg-[#f9f6f3] rounded-xl p-1">
            {PERIODES.map(p => (
              <button
                key={p.jours}
                onClick={() => { setPeriode(p.jours); setAnalyseIA(null); setShowGraphiques(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periode === p.jours ? 'bg-white text-[#2a1a12] shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-[#8a807a]'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {stats ? (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#dceeff] rounded-2xl p-2.5 md:p-4 text-center">
              <div className="text-lg md:text-2xl font-extrabold text-[#185fa5]">{stats.nb}</div>
              <div className="text-[10px] md:text-xs text-[#378ADD] font-semibold mt-1">courses</div>
            </div>
            <div className="bg-[#d4f5ec] rounded-2xl p-2.5 md:p-4 text-center">
              <div className="text-lg md:text-2xl font-extrabold text-[#13a884]">{stats.distanceTotal}</div>
              <div className="text-[10px] md:text-xs text-[#16c79a] font-semibold mt-1">km total</div>
            </div>
            <div className="bg-[#faeeda] rounded-2xl p-2.5 md:p-4 text-center">
              <div className="text-sm md:text-lg font-extrabold text-[#854f0b]">{stats.allureMoy}</div>
              <div className="text-[10px] md:text-xs text-[#EF9F27] font-semibold mt-1">allure moy.</div>
            </div>
            <div className="bg-[#efeaff] rounded-2xl p-2.5 md:p-4 text-center">
              <div className="text-sm md:text-lg font-extrabold text-[#6b4fd6]">{stats.meilleureAllure}</div>
              <div className="text-[10px] md:text-xs text-[#7c5cff] font-semibold mt-1">meilleure allure</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-[#b0a8a2] py-6">Aucune course sur cette période</div>
        )}
      </div>

      {courses.length > 0 && (
        <>
          {/* Toggle graphiques */}
          <div className="rounded-[26px] bg-white p-4 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
            <button
              onClick={() => setShowGraphiques(!showGraphiques)}
              className="w-full flex justify-between items-center px-3 py-1"
            >
              <span className="text-sm font-bold text-[#2a1a12]">📈 Graphiques</span>
              <span className="text-[#b0a8a2] text-lg leading-none">{showGraphiques ? '−' : '+'}</span>
            </button>
          </div>

          {showGraphiques && (
            <div className="flex flex-col gap-[22px]">
              {/* Graphique allure */}
              <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
                <div className="text-[18px] font-extrabold text-[#2a1a12] mb-1">Évolution de l'allure</div>
                <div className="text-[13px] text-[#8a807a] mb-4">Plus bas = plus rapide</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={courses.filter(c => c.allureDecimal)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3eee9" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} />
                    <YAxis
                      reversed
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11, fill: '#b0a8a2' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatAllure}
                      width={56}
                    />
                    <Tooltip
                      formatter={(val) => [formatAllure(val), 'Allure']}
                      labelFormatter={(l) => l}
                      contentStyle={{ borderRadius: 12, border: '1px solid #f3eee9', fontSize: 13 }}
                    />
                    <Line type="monotone" dataKey="allureDecimal" stroke="#7c5cff" strokeWidth={2.5} dot={{ r: 4, fill: '#7c5cff' }} activeDot={{ r: 5, fill: '#7c5cff', stroke: 'white', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Graphique distance */}
              <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
                <div className="text-[18px] font-extrabold text-[#2a1a12] mb-4">Distance par course</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={courses}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3eee9" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} unit=" km" width={50} />
                    <Tooltip
                      formatter={(val) => [`${val} km`, 'Distance']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #f3eee9', fontSize: 13 }}
                    />
                    <Bar dataKey="distanceNum" fill="#378ADD" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Liste courses */}
          <div className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="px-7 py-5 border-b border-[#f3eee9] text-[18px] font-extrabold text-[#2a1a12]">Détail des courses</div>
            <div className="flex flex-col">
              {[...courses].reverse().map(c => (
                <div key={c.id} className="px-7 py-3.5 flex justify-between items-center border-b border-[#f3eee9] last:border-0">
                  <div>
                    <div className="text-sm font-bold text-[#2a1a12]">{c.nom}</div>
                    <div className="text-xs text-[#b0a8a2] mt-0.5">{new Date(c.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
                  </div>
                  <div className="flex gap-2 text-xs items-center">
                    <span className="font-bold px-2.5 py-1 rounded-full bg-[#dceeff] text-[#185fa5]">{c.distanceNum} km</span>
                    <span className="font-bold px-2.5 py-1 rounded-full bg-[#efeaff] text-[#6b4fd6]">{c.allureStr}</span>
                    <span className="font-bold px-2.5 py-1 rounded-full bg-[#f9f6f3] text-[#8a807a]">{c.duree} min</span>
                    <span className="font-bold px-2.5 py-1 rounded-full bg-[#fff3ea] text-[#c2876b]">{c.kcal} kcal</span>
                    <button onClick={() => setASupprimer(c.id)} className="text-[#d8cfc8] hover:text-[#e2553f] ml-1 transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </>
      )}

      {/* Modal de confirmation de suppression */}
      {aSupprimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setASupprimer(null)}
        >
          <div
            className="bg-white rounded-[26px] shadow-2xl w-full max-w-[380px] p-7 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[17px] font-extrabold text-[#2a1a12] mb-2">Supprimer cette course ?</div>
            <div className="text-sm text-[#8a807a] mb-6">Cette action est définitive et ne peut pas être annulée.</div>
            <div className="flex gap-3">
              <button
                onClick={() => setASupprimer(null)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[#f9f6f3] text-[#8a807a]"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppression}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[#e2553f] text-white"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}