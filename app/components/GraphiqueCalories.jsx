'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

export default function GraphiqueCalories({ repas, seances }) {
  const jours = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const label = date.toLocaleDateString('fr-FR', { weekday: 'short' })

    const consommees = repas
      ?.filter(r => r.date === dateStr)
      ?.reduce((s, r) => s + r.kcal, 0) || 0

    const brulees = seances
      ?.filter(s => s.date === dateStr)
      ?.reduce((s, r) => s + (r.kcal || 0), 0) || 0

    jours.push({ label, consommees, brulees, bilan: consommees - brulees })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-medium">Calories · 7 derniers jours</div>
          <div className="text-xs text-gray-400">Consommées vs brûlées</div>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-300 inline-block"/>
            Consommées
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>
            Brûlées
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={jours} barGap={4}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(val, name) => [val + ' kcal', name === 'consommees' ? 'Consommées' : 'Brûlées']}
          />
          <ReferenceLine y={2000} stroke="#EF9F27" strokeDasharray="4 4" label={{ value: 'objectif', fontSize: 10, fill: '#BA7517' }} />
          <Bar dataKey="consommees" fill="#B5D4F4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="brulees" fill="#9FE1CB" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}