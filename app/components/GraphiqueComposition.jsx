'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function GraphiqueComposition({ composition }) {
  const [mode, setMode] = useState('kg')

  const data = [...(composition || [])]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(c => ({
      date: new Date(c.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      grasse: mode === 'kg' ? parseFloat(c.masse_grasse) : parseFloat(c.masse_grasse_pct),
      musculaire: mode === 'kg' ? parseFloat(c.masse_musculaire) : parseFloat(c.masse_musculaire_pct),
      hydrique: mode === 'kg' ? parseFloat(c.masse_hydrique) : parseFloat(c.masse_hydrique_pct),
    }))

  const unite = mode === 'pct' ? '%' : ' kg'

  function CustomTooltip({ active, payload, label, dataKey, color, nom }) {
    if (!active || !payload?.length) return null
    const val = payload.find(p => p.dataKey === dataKey)?.value
    if (val === undefined) return null
    return (
      <div className="bg-white border border-[#f3eee9] rounded-xl shadow-lg p-3 text-xs">
        <div className="font-bold text-[#2a1a12] mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[#8a807a]">{nom} :</span>
          <span className="font-bold text-[#2a1a12]">{val}{unite}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Évolution composition corporelle</div>
          <div className="text-[13px] text-[#8a807a] mt-0.5">Masse grasse, musculaire et hydrique</div>
        </div>
        <div className="flex bg-[#f9f6f3] rounded-xl p-1 gap-1">
          {['kg', 'pct'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === m ? 'bg-white text-[#2a1a12] shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-[#8a807a]'
              }`}
            >
              {m === 'kg' ? 'kg' : '%'}
            </button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="h-40 flex items-center justify-center text-[#b0a8a2] text-sm">
          Synchronise tes données Withings pour voir l'évolution
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Masse grasse — graphique principal, échelle propre ajustée à sa
              plage réelle (pas partir de 0) pour que les variations soient
              visibles, plutôt qu'écrasées par les échelles de musculaire/hydrique */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#ff8a3d] inline-block" />
              <span className="text-[13px] font-bold text-[#c2876b]">Masse grasse</span>
              <span className="text-[11px] text-[#b0a8a2] font-medium">({unite.trim()})</span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#b0a8a2' }} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: '#b0a8a2' }} tickLine={false} axisLine={false} tickFormatter={v => Math.round(v * 10) / 10} width={36} />
                <Tooltip content={<CustomTooltip dataKey="grasse" color="#ff8a3d" nom="Masse grasse" />} />
                <Line type="monotone" dataKey="grasse" stroke="#ff8a3d" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#ff8a3d', stroke: 'white', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Musculaire et hydrique — deux graphiques secondaires côte à côte,
              chacun avec sa propre échelle ajustée, en retrait visuel */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#f3eee9]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#16c79a] inline-block" />
                <span className="text-[13px] font-bold text-[#0f6e56]">Masse musculaire</span>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#b0a8a2' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9, fill: '#b0a8a2' }} tickLine={false} axisLine={false} tickFormatter={v => Math.round(v * 10) / 10} width={34} />
                  <Tooltip content={<CustomTooltip dataKey="musculaire" color="#16c79a" nom="Masse musculaire" />} />
                  <Line type="monotone" dataKey="musculaire" stroke="#16c79a" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#16c79a', stroke: 'white', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#a8c8e8] inline-block" />
                <span className="text-[13px] font-medium text-[#8a807a]">Masse hydrique</span>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#b0a8a2' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9, fill: '#b0a8a2' }} tickLine={false} axisLine={false} tickFormatter={v => Math.round(v * 10) / 10} width={34} />
                  <Tooltip content={<CustomTooltip dataKey="hydrique" color="#a8c8e8" nom="Masse hydrique" />} />
                  <Line type="monotone" dataKey="hydrique" stroke="#a8c8e8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#a8c8e8', stroke: 'white', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}