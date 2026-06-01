'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function GraphiqueComposition({ composition }) {
  const [mode, setMode] = useState('kg')

  const data = [...(composition || [])]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(c => ({
      date: new Date(c.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      'Masse grasse': mode === 'kg' ? parseFloat(c.masse_grasse) : parseFloat(c.masse_grasse_pct),
      'Masse musculaire': mode === 'kg' ? parseFloat(c.masse_musculaire) : parseFloat(c.masse_musculaire_pct),
      'Masse hydrique': mode === 'kg' ? parseFloat(c.masse_hydrique) : parseFloat(c.masse_hydrique_pct),
    }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Évolution composition corporelle</div>
          <div className="text-xs text-gray-400">Masse grasse, musculaire et hydrique</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('kg')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${mode === 'kg' ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}
          >
            kg
          </button>
          <button
            onClick={() => setMode('pct')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${mode === 'pct' ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}
          >
            %
          </button>
        </div>
      </div>

      {data.length < 2 ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
          Synchronise tes données Withings pour voir l'évolution
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v + (mode === 'pct' ? '%' : ' kg')} />
            <Tooltip formatter={(v, name) => [v + (mode === 'pct' ? '%' : ' kg'), name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Masse grasse" stroke="#EF9F27" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="Masse musculaire" stroke="#1D9E75" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="Masse hydrique" stroke="#378ADD" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}