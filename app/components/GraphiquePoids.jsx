'use client'
import { useState, useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

function daysBetween(a, b) {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
}

function trendPerWeek(points, days = 30) {
  if (!points?.length) return null
  const latest = points[points.length - 1]
  const latestDate = new Date(latest.date)
  const cutoff = new Date(latestDate)
  cutoff.setDate(cutoff.getDate() - days)
  const window = points.filter(p => new Date(p.date) >= cutoff)
  if (window.length < 2) return null
  const first = window[0]
  const last = window[window.length - 1]
  const elapsed = Math.max(1, daysBetween(first.date, last.date))
  const delta = parseFloat(last.valeur) - parseFloat(first.valeur)
  return Math.round((delta / elapsed) * 7 * 100) / 100
}

export default function GraphiquePoids({ poids, objectifs }) {
  const [periode, setPeriode] = useState(90)

  const poidsTries = useMemo(() => [...(poids || [])].sort((a, b) => new Date(a.date) - new Date(b.date)), [poids])

  const moyenneMobile = useMemo(() => {
    return poidsTries.map((p, i) => {
      const currentDate = new Date(p.date)
      const fenetre = poidsTries.filter((x, idx) => idx <= i && daysBetween(x.date, currentDate) <= 6)
      const moy = fenetre.reduce((s, x) => s + parseFloat(x.valeur), 0) / Math.max(1, fenetre.length)
      return { date: p.date, tendance: Math.round(moy * 10) / 10 }
    })
  }, [poidsTries])

  const data = useMemo(() => {
    if (!poidsTries.length) return []
    const latestDate = new Date(poidsTries[poidsTries.length - 1].date)
    const limiteDate = periode === 'tout' ? null : (() => {
      const d = new Date(latestDate)
      d.setDate(d.getDate() - periode)
      return d
    })()
    return poidsTries
      .filter(p => !limiteDate || new Date(p.date) >= limiteDate)
      .map(p => {
        const tendanceEntry = moyenneMobile.find(m => m.date === p.date)
        return {
          dateRaw: p.date,
          date: new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          poids: parseFloat(p.valeur),
          tendance: tendanceEntry?.tendance ?? parseFloat(p.valeur),
        }
      })
  }, [poidsTries, moyenneMobile, periode])

  const poidsObjectif = objectifs?.poids_objectif || 70
  const poidsDepart = objectifs?.poids_depart || (poidsTries[0] ? parseFloat(poidsTries[0].valeur) : 83)
  const poidsActuel = poidsTries.length > 0 ? parseFloat(poidsTries[poidsTries.length - 1].valeur) : poidsDepart

  const kgPerdus = poidsDepart - poidsActuel
  const kgRestants = Math.max(0, poidsActuel - poidsObjectif)
  const progressionPct = poidsDepart > poidsObjectif
    ? Math.min(100, Math.max(0, Math.round(((poidsDepart - poidsActuel) / (poidsDepart - poidsObjectif)) * 100)))
    : 0
  const rythme30 = trendPerWeek(poidsTries, 30)
  const variation30 = useMemo(() => {
    if (poidsTries.length < 2) return null
    const latest = poidsTries[poidsTries.length - 1]
    const target = new Date(latest.date)
    target.setDate(target.getDate() - 30)
    const candidates = poidsTries.slice(0, -1)
    if (!candidates.length) return null
    const nearest = candidates.reduce((best, p) => Math.abs(new Date(p.date) - target) < Math.abs(new Date(best.date) - target) ? p : best, candidates[0])
    if (daysBetween(nearest.date, target) > 12) return null
    return Math.round((parseFloat(latest.valeur) - parseFloat(nearest.valeur)) * 10) / 10
  }, [poidsTries])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const poidsVal = payload.find(p => p.dataKey === 'poids')?.value
    const tendanceVal = payload.find(p => p.dataKey === 'tendance')?.value
    return (
      <div className="bg-white border border-[#f3eee9] rounded-xl shadow-lg p-3.5 text-xs">
        <div className="font-bold text-[#2a1a12] mb-1.5">{label}</div>
        {poidsVal !== undefined && <div className="text-[#8a807a]">Pesée : <span className="font-bold text-[#2a1a12]">{poidsVal} kg</span></div>}
        {tendanceVal !== undefined && <div className="text-[#8a807a]">Tendance 7j : <span className="font-bold text-[#16c79a]">{tendanceVal} kg</span></div>}
      </div>
    )
  }

  const signed = value => value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${value}`

  return (
    <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between gap-4 mb-1">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Trajectoire de poids</div>
          <div className="text-[13px] text-[#8a807a] mt-0.5">Pesées Withings · la tendance 7j lisse les variations quotidiennes</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#f9f6f3] rounded-xl p-1 gap-1">
            {[7, 30, 90, 'tout'].map(p => (
              <button key={p} onClick={() => setPeriode(p)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periode === p ? 'bg-white text-[#2a1a12] shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-[#8a807a]'}`}>
                {p === 'tout' ? 'Tout' : `${p}j`}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold bg-[#d4f5ec] text-[#13a884] px-3 py-1.5 rounded-full whitespace-nowrap">{poids?.length || 0} mesures</span>
        </div>
      </div>

      {poidsTries.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mt-5 mb-3">
            <div className="rounded-2xl bg-[#f9f6f3] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide font-bold text-[#a39790]">Depuis le départ</div>
              <div className="text-xl font-extrabold text-[#2a1a12] mt-1">{signed(Math.round((poidsActuel - poidsDepart) * 10) / 10)} kg</div>
              <div className="text-[11px] text-[#8a807a]">{poidsDepart} → {poidsActuel} kg</div>
            </div>
            <div className="rounded-2xl bg-[#f9f6f3] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide font-bold text-[#a39790]">30 derniers jours</div>
              <div className="text-xl font-extrabold text-[#2a1a12] mt-1">{variation30 === null ? '—' : `${signed(variation30)} kg`}</div>
              <div className="text-[11px] text-[#8a807a]">{rythme30 === null ? 'Pas assez de mesures' : `${signed(rythme30)} kg / semaine`}</div>
            </div>
            <div className="rounded-2xl bg-[#f9f6f3] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide font-bold text-[#a39790]">Vers l’objectif</div>
              <div className="text-xl font-extrabold text-[#16a884] mt-1">{progressionPct}%</div>
              <div className="text-[11px] text-[#8a807a]">{kgRestants.toFixed(1)} kg restants</div>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-2 p-3.5 rounded-2xl bg-gradient-to-r from-[#fff5ee] to-[#f4fbf8]">
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-semibold text-[#8a807a] mb-1.5"><span>{poidsDepart} kg</span><span>{poidsObjectif} kg objectif</span></div>
              <div className="h-2 rounded-full bg-white overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#ff8a3d] to-[#16c79a] transition-all duration-700" style={{ width: `${progressionPct}%` }} /></div>
            </div>
          </div>
        </>
      )}

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-[#b0a8a2] text-sm">Aucune donnée de poids encore — synchronise Withings ou ajoute ta première pesée.</div>
      ) : data.length < 2 ? (
        <div className="h-40 flex items-center justify-center text-[#b0a8a2] text-sm">Une deuxième pesée permettra d’afficher une tendance.</div>
      ) : (
        <ResponsiveContainer width="100%" height={235}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs><linearGradient id="tendanceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16c79a" stopOpacity={0.25} /><stop offset="100%" stopColor="#16c79a" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} tickFormatter={v => v + ' kg'} width={50} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={poidsObjectif} stroke="#a78bff" strokeDasharray="4 4" label={{ value: 'objectif', fontSize: 11, fill: '#7c5cff', position: 'insideTopLeft' }} />
            <Area type="monotone" dataKey="tendance" stroke="none" fill="url(#tendanceGradient)" />
            <Line type="monotone" dataKey="poids" stroke="#d8cfc8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={false} />
            <Line type="monotone" dataKey="tendance" stroke="#16c79a" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#16c79a', stroke: 'white', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
