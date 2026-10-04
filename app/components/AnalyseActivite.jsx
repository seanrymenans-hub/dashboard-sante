'use client'
import { useMemo, useState } from 'react'

const PERIODES = [
  { label: '7j', jours: 7 }, { label: '1 mois', jours: 30 }, { label: '3 mois', jours: 90 }, { label: '6 mois', jours: 180 },
]

export default function AnalyseActivite({ seances, repas, objectifs, macros }) {
  const [periode, setPeriode] = useState(7)
  const [analyseIA, setAnalyseIA] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const seancesPeriode = useMemo(() => (seances || []).filter(s => (Date.now() - new Date(`${s.date}T12:00:00`).getTime()) / 86400000 < periode).sort((a,b) => a.date.localeCompare(b.date)), [seances, periode])
  const repartition = useMemo(() => seancesPeriode.reduce((a,s) => ({...a,[s.type]:(a[s.type]||0)+1}), {course:0,renforcement:0,autre:0}), [seancesPeriode])
  const totalMin = seancesPeriode.reduce((sum,s) => sum + (Number(s.duree)||0),0)
  const joursNutrition = new Set((repas || []).filter(r => (Date.now() - new Date(`${r.date}T12:00:00`).getTime()) / 86400000 < periode).map(r => r.date)).size

  async function analyser() {
    setLoadingIA(true)
    try {
      const repasPeriode = (repas || []).filter(r => (Date.now() - new Date(`${r.date}T12:00:00`).getTime()) / 86400000 < periode)
      const res = await fetch('/api/analyse-activite', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({seances:seancesPeriode,repas:repasPeriode,objectifs,periode,macros}) })
      const data = await res.json(); if(data.analyse) setAnalyseIA(data)
    } catch(e) { console.error(e) }
    setLoadingIA(false)
  }

  return <section className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden">
    <div className="px-7 py-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px]">✦</span><div><div className="text-[15px] font-extrabold">Analyse IA de mon activité</div><div className="text-xs opacity-65 mt-0.5">Charge, équilibre, progression et récupération — uniquement sur clic.</div></div></div>
        <div className="flex gap-1 bg-white/[0.1] rounded-xl p-1 self-start">{PERIODES.map(p => <button key={p.jours} onClick={() => {setPeriode(p.jours);setAnalyseIA(null)}} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${periode===p.jours?'bg-white/20 text-white':'text-white/60'}`}>{p.label}</button>)}</div>
      </div>

      {!analyseIA && !loadingIA && <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-2 flex-wrap"><span className="text-xs font-semibold bg-white/[0.1] px-3 py-1.5 rounded-full">{seancesPeriode.length} séance{seancesPeriode.length>1?'s':''}</span><span className="text-xs font-semibold bg-white/[0.1] px-3 py-1.5 rounded-full">{totalMin} min</span><span className="text-xs font-semibold bg-white/[0.1] px-3 py-1.5 rounded-full">🏃 {repartition.course||0} · 💪 {repartition.renforcement||0} · ⚡ {repartition.autre||0}</span><span className="text-xs font-semibold bg-white/[0.1] px-3 py-1.5 rounded-full">Nutrition suivie {joursNutrition}j</span></div>
        <div className="text-right"><button onClick={analyser} disabled={seancesPeriode.length===0} className="bg-white/[0.13] hover:bg-white/20 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl disabled:opacity-35">{seancesPeriode.length===0?'Pas assez de données':'Analyser mon activité ✨'}</button>{seancesPeriode.length===0 && <div className="text-[11px] opacity-55 mt-1">Aucune séance enregistrée sur cette période</div>}</div>
      </div>}

      {loadingIA && <div className="text-center py-6 text-sm opacity-70">Analyse de ta charge et de ta progression…</div>}
      {analyseIA && <div className="mt-4">
        <div className="bg-white/[0.08] rounded-2xl p-4 mb-3 text-sm leading-relaxed font-medium">{analyseIA.analyse}</div>
        <div className="grid md:grid-cols-2 gap-2">{analyseIA.points?.map((p,i) => <div key={i} className="bg-white/[0.06] rounded-xl px-3.5 py-3 flex gap-2"><span className={p.positif?'text-[#7be8b5]':'text-[#ffc78a]'}>{p.positif?'✓':'→'}</span><span className="text-sm opacity-90">{p.texte}</span></div>)}</div>
        {analyseIA.semaineProchaine?.length>0 && <div className="mt-4 pt-4 border-t border-white/10"><div className="text-xs font-bold opacity-65 mb-3 tracking-wide">SEMAINE PROCHAINE</div><div className="grid md:grid-cols-2 gap-2">{analyseIA.semaineProchaine.map((s,i)=><div key={i} className="bg-white/[0.08] rounded-xl px-4 py-3"><div className="flex justify-between gap-2"><div className="text-sm font-bold">{s.activite}</div>{s.jour&&<span className="text-xs font-bold bg-white/[0.12] px-2.5 py-1 rounded-full">{s.jour}</span>}</div><div className="text-xs opacity-70 mt-1">{s.raison}</div></div>)}</div></div>}
        <button onClick={()=>setAnalyseIA(null)} className="text-xs opacity-70 underline mt-4">Nouvelle analyse</button>
      </div>}
    </div>
  </section>
}
