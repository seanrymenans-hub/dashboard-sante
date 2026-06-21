'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function GraphiquePoids({ poids, objectifs }) {
  const data = [...(poids || [])].reverse().map(p => ({
    date: new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    poids: parseFloat(p.valeur)
  }))

  return (
    <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Courbe de poids</div>
          <div className="text-[13px] text-[#8a807a] mt-0.5">Historique Withings</div>
        </div>
        <span className="text-xs font-bold bg-[#d4f5ec] text-[#13a884] px-3 py-1.5 rounded-full">
          {poids?.length || 0} mesures
        </span>
      </div>
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-[#b0a8a2] text-sm">
          Aucune donnée de poids encore — ajoute ta première pesée !
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} tickFormatter={v => v + ' kg'} />
            <Tooltip
              formatter={v => [v + ' kg', 'Poids']}
              contentStyle={{ borderRadius: 12, border: '1px solid #f3eee9', fontSize: 13 }}
            />
            <ReferenceLine y={objectifs?.poids_objectif || 70} stroke="#a78bff" strokeDasharray="4 4" label={{ value: 'objectif', fontSize: 11, fill: '#7c5cff' }} />
            <Line type="monotone" dataKey="poids" stroke="#16c79a" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#16c79a' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}