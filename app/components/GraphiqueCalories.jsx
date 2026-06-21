'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function GraphiqueCalories({ repas, seances, objectifs }) {
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
    <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Calories · 7 derniers jours</div>
          <div className="text-[13px] text-[#8a807a] mt-0.5">Consommées vs brûlées</div>
        </div>
        <div className="flex gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#c2876b]">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[#ff8a3d] inline-block"/>
            Consommées
          </span>
          <span className="flex items-center gap-1.5 text-[#0f6e56]">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[#16c79a] inline-block"/>
            Brûlées
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={jours} barGap={4}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#b0a8a2' }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(val, name) => [val + ' kcal', name === 'consommees' ? 'Consommées' : 'Brûlées']}
            contentStyle={{ borderRadius: 12, border: '1px solid #f3eee9', fontSize: 13 }}
          />
          <ReferenceLine y={objectifs?.kcal_journalier || 1850} stroke="#7c5cff" strokeDasharray="4 4" label={{ value: 'objectif', fontSize: 11, fill: '#534AB7' }} />
          <Bar dataKey="consommees" fill="#ff8a3d" radius={[6, 6, 0, 0]} />
          <Bar dataKey="brulees" fill="#16c79a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}