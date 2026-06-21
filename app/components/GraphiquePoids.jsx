'use client'
import { useState, useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts'

export default function GraphiquePoids({ poids, objectifs }) {
  const [periode, setPeriode] = useState(90)

  const poidsTries = useMemo(() => [...(poids || [])].sort((a, b) => new Date(a.date) - new Date(b.date)), [poids])

  const poidsFiltres = useMemo(() => {
    if (periode === 'tout') return poidsTries
    const limite = new Date()
    limite.setDate(limite.getDate() - periode)
    return poidsTries.filter(p => new Date(p.date) >= limite)
  }, [poidsTries, periode])

  // Moyenne mobile 7 jours — calculée sur la série COMPLÈTE pour que les premiers
  // points affichés (même en vue 30j) aient déjà un historique pour se lisser,
  // puis on filtre ensuite à la période visible.
  const moyenneMobile = useMemo(() => {
    return poidsTries.map((p, i) => {
      const fenetre = poidsTries.slice(Math.max(0, i - 6), i + 1)
      const moy = fenetre.reduce((s, x) => s + parseFloat(x.valeur), 0) / fenetre.length
      return { date: p.date, tendance: Math.round(moy * 10) / 10 }
    })
  }, [poidsTries])

  const data = useMemo(() => {
    const limiteDate = periode === 'tout' ? null : (() => {
      const d = new Date()
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

  const kgPerdus = Math.max(0, poidsDepart - poidsActuel)
  const kgRestants = Math.max(0, poidsActuel - poidsObjectif)
  const progressionPct = poidsDepart > poidsObjectif
    ? Math.min(100, Math.max(0, Math.round((kgPerdus / (poidsDepart - poidsObjectif)) * 100)))
    : 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const poidsVal = payload.find(p => p.dataKey === 'poids')?.value
    const tendanceVal = payload.find(p => p.dataKey === 'tendance')?.value
    return (
      <div className="bg-white border border-[#f3eee9] rounded-xl shadow-lg p-3.5 text-xs">
        <div className="font-bold text-[#2a1a12] mb-1.5">{label}</div>
        {poidsVal !== undefined && (
          <div className="text-[#8a807a]">Pesée : <span className="font-bold text-[#2a1a12]">{poidsVal} kg</span></div>
        )}
        {tendanceVal !== undefined && (
          <div className="text-[#8a807a]">Tendance 7j : <span className="font-bold text-[#16c79a]">{tendanceVal} kg</span></div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Courbe de poids</div>
          <div className="text-[13px] text-[#8a807a] mt-0.5">Historique Withings · tendance lissée sur 7 jours</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#f9f6f3] rounded-xl p-1 gap-1">
            {[30, 90, 'tout'].map(p => (
              <button
                key={p}
                onClick={() => setPeriode(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periode === p ? 'bg-white text-[#2a1a12] shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-[#8a807a]'
                }`}
              >
                {p === 'tout' ? 'Tout' : `${p}j`}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold bg-[#d4f5ec] text-[#13a884] px-3 py-1.5 rounded-full whitespace-nowrap">
            {poids?.length || 0} mesures
          </span>
        </div>
      </div>

      {/* Bandeau de progression — connecte le graphique à l'objectif fat-loss */}
      {poidsTries.length > 0 && (
        <div className="flex items-center gap-5 mt-5 mb-2 p-4 rounded-2xl bg-gradient-to-r from-[#f9f6f3] to-[#f3eee9]">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-semibold text-[#8a807a] mb-1.5">
              <span>{poidsDepart} kg <span className="text-[#b0a8a2] font-normal">départ</span></span>
              <span>{poidsObjectif} kg <span className="text-[#b0a8a2] font-normal">objectif</span></span>
            </div>
            <div className="h-2.5 rounded-full bg-white overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff8a3d] to-[#16c79a] transition-all duration-700"
                style={{ width: `${progressionPct}%` }}
              />
            </div>
          </div>
          <div className="text-center flex-shrink-0 pl-2 border-l border-[#e8e1da]">
            <div className="text-2xl font-extrabold text-[#16c79a] leading-none">{kgPerdus.toFixed(1)}</div>
            <div className="text-[11px] text-[#8a807a] font-medium mt-1">kg perdus</div>
          </div>
          <div className="text-center flex-shrink-0">
            <div className="text-2xl font-extrabold text-[#2a1a12] leading-none">{kgRestants.toFixed(1)}</div>
            <div className="text-[11px] text-[#8a807a] font-medium mt-1">kg restants</div>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-[#b0a8a2] text-sm">
          Aucune donnée de poids encore — ajoute ta première pesée !
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="tendanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16c79a" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#16c79a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} tickFormatter={v => v + ' kg'} width={50} />
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine y={poidsObjectif} stroke="#a78bff" strokeDasharray="4 4" label={{ value: 'objectif', fontSize: 11, fill: '#7c5cff', position: 'insideTopLeft' }} />

            {/* Zone ombrée sous la tendance lissée — donne du poids visuel à la courbe principale */}
            <Area type="monotone" dataKey="tendance" stroke="none" fill="url(#tendanceGradient)" />

            {/* Pesées brutes — discrètes, en pointillés, pour montrer le bruit réel sans l'imposer */}
            <Line type="monotone" dataKey="poids" stroke="#d8cfc8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={false} />

            {/* Tendance lissée 7j — la vraie star du graphique */}
            <Line type="monotone" dataKey="tendance" stroke="#16c79a" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#16c79a', stroke: 'white', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}