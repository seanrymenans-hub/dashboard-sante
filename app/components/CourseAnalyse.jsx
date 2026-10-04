'use client'
import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'

const PERIODES = [
  { label: '7j', jours: 7 },
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
function diffDays(date) { return (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000 }

export default function CourseAnalyse({ seances, onRefresh }) {
  const [periode, setPeriode] = useState(90)
  const [showGraphiques, setShowGraphiques] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)

  const normalize = (s) => ({
    ...s,
    allureDecimal: parseAllure(s.notes),
    allureStr: parseAllure(s.notes) ? formatAllure(parseAllure(s.notes)) : '—',
    distanceNum: parseFloat(s.distance) || 0,
    dateLabel: new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  })

  const courses = useMemo(() => (seances || []).filter(s => s.type === 'course' && diffDays(s.date) >= 0 && diffDays(s.date) < periode).sort((a,b) => a.date.localeCompare(b.date)).map(normalize), [seances, periode])
  const coursesPrec = useMemo(() => (seances || []).filter(s => s.type === 'course' && diffDays(s.date) >= periode && diffDays(s.date) < periode * 2).sort((a,b) => a.date.localeCompare(b.date)).map(normalize), [seances, periode])

  const statsFor = (list) => {
    if (!list.length) return null
    const distanceTotal = list.reduce((s,c) => s + c.distanceNum, 0)
    const allures = list.filter(c => c.allureDecimal)
    const allureDecimal = allures.length ? allures.reduce((s,c) => s + c.allureDecimal, 0) / allures.length : null
    return {
      nb: list.length,
      distanceTotal: Math.round(distanceTotal * 10) / 10,
      distanceMoy: Math.round((distanceTotal / list.length) * 10) / 10,
      longest: Math.round(Math.max(...list.map(c => c.distanceNum)) * 10) / 10,
      allureDecimal,
      allureMoy: formatAllure(allureDecimal),
      meilleureAllure: allures.length ? formatAllure(Math.min(...allures.map(c => c.allureDecimal))) : '—'
    }
  }
  const stats = useMemo(() => statsFor(courses), [courses])
  const statsPrec = useMemo(() => statsFor(coursesPrec), [coursesPrec])
  const allureGainSec = stats?.allureDecimal && statsPrec?.allureDecimal ? Math.round((statsPrec.allureDecimal - stats.allureDecimal) * 60) : null
  const volumeDelta = stats && statsPrec?.distanceTotal ? Math.round(((stats.distanceTotal - statsPrec.distanceTotal) / statsPrec.distanceTotal) * 100) : null

  async function confirmerSuppression() {
    if (!aSupprimer) return
    await supabase.from('seances').delete().eq('id', aSupprimer)
    setASupprimer(null); onRefresh()
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <section className="rounded-[26px] bg-white p-[24px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-5">
          <div><div className="text-[18px] font-extrabold text-[#2a1a12]">Running</div><div className="text-[13px] text-[#8a807a] mt-0.5">Volume, allure et progression réelle</div></div>
          <div className="flex gap-1 bg-[#f9f6f3] rounded-xl p-1 overflow-x-auto">{PERIODES.map(p => <button key={p.jours} onClick={() => { setPeriode(p.jours); setShowGraphiques(false) }} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${periode === p.jours ? 'bg-white text-[#2a1a12] shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-[#8a807a]'}`}>{p.label}</button>)}</div>
        </div>

        {stats ? <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-[#dceeff] rounded-2xl p-3.5 text-center"><div className="text-xl font-extrabold text-[#185fa5]">{stats.nb}</div><div className="text-[11px] text-[#378ADD] font-semibold mt-1">courses</div></div>
            <div className="bg-[#d4f5ec] rounded-2xl p-3.5 text-center"><div className="text-xl font-extrabold text-[#13a884]">{stats.distanceTotal} km</div><div className="text-[11px] text-[#16c79a] font-semibold mt-1">volume</div></div>
            <div className="bg-[#faeeda] rounded-2xl p-3.5 text-center"><div className="text-lg font-extrabold text-[#854f0b]">{stats.allureMoy}</div><div className="text-[11px] text-[#EF9F27] font-semibold mt-1">allure moyenne</div></div>
            <div className="bg-[#efeaff] rounded-2xl p-3.5 text-center"><div className="text-lg font-extrabold text-[#6b4fd6]">{stats.meilleureAllure}</div><div className="text-[11px] text-[#7c5cff] font-semibold mt-1">meilleure allure</div></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div className="rounded-xl bg-[#fffaf6] border border-[#f3eee9] px-3.5 py-2.5"><div className="text-[10px] uppercase font-bold text-[#b0a8a2]">Distance moyenne</div><div className="text-sm font-extrabold text-[#2a1a12] mt-1">{stats.distanceMoy} km</div></div>
            <div className="rounded-xl bg-[#fffaf6] border border-[#f3eee9] px-3.5 py-2.5"><div className="text-[10px] uppercase font-bold text-[#b0a8a2]">Plus longue sortie</div><div className="text-sm font-extrabold text-[#2a1a12] mt-1">{stats.longest} km</div></div>
            <div className="rounded-xl bg-[#fffaf6] border border-[#f3eee9] px-3.5 py-2.5"><div className="text-[10px] uppercase font-bold text-[#b0a8a2]">Allure vs période préc.</div><div className={`text-sm font-extrabold mt-1 ${allureGainSec === null ? 'text-[#8a807a]' : allureGainSec >= 0 ? 'text-[#0f6e56]' : 'text-[#c2876b]'}`}>{allureGainSec === null ? 'Pas assez de données' : allureGainSec === 0 ? 'stable' : `${allureGainSec > 0 ? '−' : '+'}${Math.abs(allureGainSec)} sec/km`}</div></div>
            <div className="rounded-xl bg-[#fffaf6] border border-[#f3eee9] px-3.5 py-2.5"><div className="text-[10px] uppercase font-bold text-[#b0a8a2]">Volume vs période préc.</div><div className="text-sm font-extrabold text-[#2a1a12] mt-1">{volumeDelta === null ? 'Pas assez de données' : `${volumeDelta >= 0 ? '+' : ''}${volumeDelta}%`}</div></div>
          </div>
        </> : <div className="text-center text-sm text-[#8a807a] py-5">Aucune course enregistrée sur cette période.</div>}
      </section>

      {courses.length > 0 && <>
        <div className="rounded-[26px] bg-white p-4 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]"><button onClick={() => setShowGraphiques(!showGraphiques)} className="w-full flex justify-between items-center px-3 py-1"><span className="text-sm font-bold text-[#2a1a12]">📈 Tendances running</span><span className="text-[#b0a8a2] text-lg">{showGraphiques ? '−' : '+'}</span></button></div>
        {showGraphiques && <div className="grid lg:grid-cols-2 gap-[22px]">
          <div className="rounded-[26px] bg-white p-[24px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]"><div className="text-[16px] font-extrabold text-[#2a1a12] mb-1">Allure par sortie</div><div className="text-[12px] text-[#8a807a] mb-3">Plus bas = plus rapide</div><ResponsiveContainer width="100%" height={190}><LineChart data={courses.filter(c => c.allureDecimal)}><CartesianGrid strokeDasharray="3 3" stroke="#f3eee9"/><XAxis dataKey="dateLabel" tick={{fontSize:10,fill:'#b0a8a2'}} tickLine={false} axisLine={false}/><YAxis reversed domain={['auto','auto']} tick={{fontSize:10,fill:'#b0a8a2'}} tickLine={false} axisLine={false} tickFormatter={formatAllure} width={55}/><Tooltip formatter={v => [formatAllure(v),'Allure']} contentStyle={{borderRadius:12,border:'1px solid #f3eee9',fontSize:12}}/><Line type="monotone" dataKey="allureDecimal" stroke="#7c5cff" strokeWidth={2.5} dot={{r:3,fill:'#7c5cff'}}/></LineChart></ResponsiveContainer></div>
          <div className="rounded-[26px] bg-white p-[24px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]"><div className="text-[16px] font-extrabold text-[#2a1a12] mb-4">Distance par sortie</div><ResponsiveContainer width="100%" height={190}><BarChart data={courses}><CartesianGrid strokeDasharray="3 3" stroke="#f3eee9"/><XAxis dataKey="dateLabel" tick={{fontSize:10,fill:'#b0a8a2'}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:10,fill:'#b0a8a2'}} tickLine={false} axisLine={false} unit=" km" width={46}/><Tooltip formatter={v => [`${v} km`,'Distance']} contentStyle={{borderRadius:12,border:'1px solid #f3eee9',fontSize:12}}/><Bar dataKey="distanceNum" fill="#378ADD" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
        </div>}
        <section className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="px-7 py-5 border-b border-[#f3eee9]"><div className="text-[18px] font-extrabold text-[#2a1a12]">Courses récentes</div><div className="text-xs text-[#8a807a] mt-0.5">Les métriques détaillées restent consultables sans IA</div></div>
          {[...courses].reverse().slice(0,8).map(c => <div key={c.id} className="px-7 py-3.5 flex flex-col md:flex-row md:justify-between md:items-center gap-2 border-b border-[#f3eee9] last:border-0"><div><div className="text-sm font-bold text-[#2a1a12]">{c.nom}</div><div className="text-xs text-[#b0a8a2] mt-0.5">{new Date(c.date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}</div></div><div className="flex gap-2 text-xs items-center flex-wrap"><span className="font-bold px-2.5 py-1 rounded-full bg-[#dceeff] text-[#185fa5]">{c.distanceNum} km</span><span className="font-bold px-2.5 py-1 rounded-full bg-[#efeaff] text-[#6b4fd6]">{c.allureStr}</span><span className="font-bold px-2.5 py-1 rounded-full bg-[#f9f6f3] text-[#8a807a]">{c.duree} min</span><span className="font-bold px-2.5 py-1 rounded-full bg-[#fff3ea] text-[#c2876b]">{c.kcal} kcal</span><button onClick={() => setASupprimer(c.id)} className="text-[#d8cfc8] hover:text-[#e2553f]">✕</button></div></div>)}
        </section>
      </>}

      {aSupprimer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={() => setASupprimer(null)}><div className="bg-white rounded-[26px] shadow-2xl w-full max-w-[380px] p-7 text-center" onClick={e => e.stopPropagation()}><div className="text-[17px] font-extrabold text-[#2a1a12] mb-2">Supprimer cette course ?</div><div className="text-sm text-[#8a807a] mb-6">Cette action est définitive.</div><div className="flex gap-3"><button onClick={() => setASupprimer(null)} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[#f9f6f3] text-[#8a807a]">Annuler</button><button onClick={confirmerSuppression} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[#e2553f] text-white">Supprimer</button></div></div></div>}
    </div>
  )
}
