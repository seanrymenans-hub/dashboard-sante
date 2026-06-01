'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function GraphiquePoids({ poids, objectifs }) {
  const data = [...(poids || [])].reverse().map(p => ({
    date: new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    poids: parseFloat(p.valeur)
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Courbe de poids</div>
          <div className="text-xs text-gray-400">Historique Withings</div>
        </div>
        <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">
          {poids?.length || 0} mesures
        </span>
      </div>
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
          Aucune donnée de poids encore — ajoute ta première pesée !
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v + ' kg'} />
            <Tooltip formatter={v => [v + ' kg', 'Poids']} />
            <ReferenceLine y={objectifs?.poids_objectif || 70} stroke="#9FE1CB" strokeDasharray="4 4" label={{ value: 'objectif', fontSize: 11, fill: '#1D9E75' }} />
            <Line type="monotone" dataKey="poids" stroke="#1D9E75" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}