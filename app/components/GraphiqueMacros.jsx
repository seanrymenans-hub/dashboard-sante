'use client'
import { useState, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

export default function GraphiqueMacros({ repas, objectifs }) {
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
        calories: Math.round(repasJour.reduce((s, r) => s + (r.kcal || 0), 0)),
      }
    })
  }, [repas, periode])

  const kcalObj = objectifs?.kcal_journalier || 1850
  const protObj = objectifs?.proteines_objectif || 150
  const carbObj = objectifs?.glucides_objectif || 250
  const lipObj = objectifs?.lipides_objectif || 67

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3 text-xs">
        <div className="font-medium text-gray-700 mb-2">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-500">{p.name} :</span>
            <span className="font-medium text-gray-700">{p.value}{p.name === 'Calories' ? ' kcal' : 'g'}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="font-medium">Évolution macros</div>
          <div className="text-xs text-gray-400 mt-1">Protéines · Glucides · Lipides · Calories</div>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {[7, 30].map(p => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                periode === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      {/* Objectifs rapides */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { label: 'Protéines', obj: protObj, unit: 'g', dot: 'bg-blue-400' },
          { label: 'Glucides', obj: carbObj, unit: 'g', dot: 'bg-amber-400' },
          { label: 'Lipides', obj: lipObj, unit: 'g', dot: 'bg-green-400' },
          { label: 'Calories', obj: kcalObj, unit: 'kcal', dot: 'bg-red-400' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
            <div className={`w-2 h-2 rounded-full ${item.dot}`} />
            <span className="text-xs text-gray-500">{item.label}</span>
            <span className="text-xs font-medium text-gray-700">obj. {item.obj}{item.unit}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval={periode === 30 ? 4 : 0} />
          <YAxis yAxisId="macros" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="calories" orientation="right" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '12px' }} />
          <Bar yAxisId="macros" dataKey="proteines" name="Protéines" stackId="macros" fill="#60a5fa" />
          <Bar yAxisId="macros" dataKey="glucides" name="Glucides" stackId="macros" fill="#fbbf24" />
          <Bar yAxisId="macros" dataKey="lipides" name="Lipides" stackId="macros" fill="#4ade80" radius={[4, 4, 0, 0]} />
          <Line yAxisId="calories" type="monotone" dataKey="calories" name="Calories" stroke="#f87171" strokeWidth={2} dot={{ fill: '#f87171', r: 3 }} activeDot={{ r: 5 }} />
          <ReferenceLine yAxisId="calories" y={kcalObj} stroke="#f87171" strokeDasharray="4 4" strokeOpacity={0.4} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}