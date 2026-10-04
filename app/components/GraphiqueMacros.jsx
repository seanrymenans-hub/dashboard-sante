'use client'
import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

export default function GraphiqueMacros({ repas, objectifs, macros }) {
  const [periode, setPeriode] = useState(7)

  const data = useMemo(() => {
    const today = new Date()
    return Array.from({ length: periode }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (periode - 1 - i))
      const dateStr = date.toISOString().split('T')[0]
      const repasJour = repas.filter(r => r.date === dateStr)
      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        proteines: Math.round(repasJour.reduce((s, r) => s + (r.proteines || 0), 0)),
        glucides: Math.round(repasJour.reduce((s, r) => s + (r.glucides || 0), 0)),
        lipides: Math.round(repasJour.reduce((s, r) => s + (r.lipides || 0), 0)),
      }
    })
  }, [repas, periode])

  // Objectifs dynamiques du Health Engine (2g/kg protéines, 25% lipides, reste
  // en glucides) plutôt que les valeurs fixes objectifs.xxx_objectif réglées
  // dans Paramètres — pour rester cohérent avec ce qui est affiché ailleurs
  // dans Nutrition (Aujourd'hui, Suggestions, Analyse utilisent tous `macros`).
  const protObj = macros?.proteines || objectifs?.proteines_objectif || 150
  const carbObj = macros?.glucides || objectifs?.glucides_objectif || 250
  const lipObj = macros?.lipides || objectifs?.lipides_objectif || 67

  const macrosConfig = [
    { key: 'proteines', label: 'Protéines', color: '#378ADD', obj: protObj },
    { key: 'glucides', label: 'Glucides', color: '#EF9F27', obj: carbObj },
    { key: 'lipides', label: 'Lipides', color: '#16c79a', obj: lipObj },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-[#f3eee9] rounded-xl shadow-lg p-3.5 text-xs">
        <div className="font-bold text-[#2a1a12] mb-2">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[#8a807a]">{p.name} :</span>
            <span className="font-bold text-[#2a1a12]">{p.value}g</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Évolution macros</div>
          <div className="text-[13px] text-[#8a807a] mt-0.5">Protéines · Glucides · Lipides, par rapport à l'objectif</div>
        </div>
        <div className="flex bg-[#f9f6f3] rounded-xl p-1 gap-1">
          {[7, 30].map(p => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periode === p ? 'bg-white text-[#2a1a12] shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-[#8a807a]'
              }`}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      {/* Objectifs rapides */}
      <div className="flex gap-2 flex-wrap mb-5">
        {macrosConfig.map(m => (
          <div key={m.label} className="flex items-center gap-2 bg-[#f9f6f3] rounded-xl px-3.5 py-2">
            <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
            <span className="text-xs text-[#8a807a] font-medium">{m.label}</span>
            <span className="text-xs font-bold text-[#2a1a12]">obj. {m.obj}g</span>
          </div>
        ))}
      </div>

      {/* 3 lignes simples, une carte par macro pour éviter de surcharger un seul graphique */}
      <div className="flex flex-col gap-4">
        {macrosConfig.map(m => (
          <div key={m.key}>
            <div className="text-xs font-bold mb-1.5" style={{ color: m.color }}>{m.label}</div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3eee9" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#b0a8a2', fontSize: 10 }} axisLine={false} tickLine={false} interval={periode === 30 ? 4 : 0} />
                <YAxis tick={{ fill: '#b0a8a2', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={m.obj} stroke={m.color} strokeDasharray="4 4" strokeOpacity={0.5} />
                <Line
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2.5}
                  dot={{ fill: m.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  )
}