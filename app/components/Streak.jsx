'use client'
import { useMemo } from 'react'

export default function Streak({ repas, objectifs }) {
  const kcalObj = objectifs?.kcal_journalier || 1850

  const stats = useMemo(() => {
    const parJour = {}
    repas.forEach(r => {
      if (!parJour[r.date]) parJour[r.date] = 0
      parJour[r.date] += r.kcal
    })

    const jours = Object.keys(parJour).sort((a, b) => b.localeCompare(a))
    
    let streak = 0
    let record = 0
    let tempStreak = 0
    let totalJoursReussis = 0

    for (let i = 0; i < jours.length; i++) {
      const reussi = parJour[jours[i]] <= kcalObj && parJour[jours[i]] > 0
      if (reussi) {
        totalJoursReussis++
        tempStreak++
        if (tempStreak > record) record = tempStreak
        if (i === 0 || streak === i) streak = tempStreak
      } else {
        tempStreak = 0
      }
    }

    const tauxReussite = jours.length > 0 ? Math.round(totalJoursReussis / jours.length * 100) : 0

    return { streak, record, totalJoursReussis, tauxReussite, totalJours: jours.length }
  }, [repas, kcalObj])

  const badges = [
    { label: '1er jour', emoji: '🌱', seuil: 1, atteint: stats.record >= 1 },
    { label: '3 jours', emoji: '🔥', seuil: 3, atteint: stats.record >= 3 },
    { label: '7 jours', emoji: '⚡', seuil: 7, atteint: stats.record >= 7 },
    { label: '14 jours', emoji: '💪', seuil: 14, atteint: stats.record >= 14 },
    { label: '30 jours', emoji: '🏆', seuil: 30, atteint: stats.record >= 30 },
    { label: '60 jours', emoji: '👑', seuil: 60, atteint: stats.record >= 60 },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <div className="font-medium mb-4">Streak & motivation</div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{stats.streak}</div>
          <div className="text-xs text-orange-400 mt-1">jours consécutifs 🔥</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-500">{stats.record}</div>
          <div className="text-xs text-purple-400 mt-1">record personnel 🏆</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{stats.tauxReussite}%</div>
          <div className="text-xs text-blue-400 mt-1">taux de réussite</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-3">Badges débloqués</div>
        <div className="flex gap-3 flex-wrap">
          {badges.map(b => (
            <div
              key={b.label}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all ${b.atteint ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50 opacity-40'}`}
            >
              <div className="text-2xl mb-1">{b.emoji}</div>
              <div className="text-xs font-medium text-gray-600">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-400 p-3 bg-gray-50 rounded-lg">
        Un jour est "réussi" quand tu respectes ton objectif calorique de {kcalObj} kcal.
        Tu as réussi <strong className="text-gray-600">{stats.totalJoursReussis} jours</strong> sur {stats.totalJours} jours trackés.
      </div>
    </div>
  )
}