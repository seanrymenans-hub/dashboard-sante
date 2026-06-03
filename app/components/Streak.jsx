'use client'
import { useMemo } from 'react'

export default function Streak({ repas, objectifs, pas, seances }) {
  const tmb = objectifs?.tmb || 1875
  const tef = Math.round(tmb * 0.10)
  const kcalPasMoy = pas?.slice(0, 7).reduce((s, p) => s + (p.calories_pas || 0), 0) / Math.max(1, Math.min(7, pas?.length || 1))
  const kcalObj = Math.max(1200, tmb + tef + Math.round(kcalPasMoy) - (objectifs?.deficit_cible || 750))

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

    // Streak jours actifs (objectif pas)
    const objectifPas = objectifs?.objectif_pas || 10000
    const pasParJour = {}
    pas?.forEach(p => { pasParJour[p.date] = p.nb_pas })
    const joursAvecPas = Object.keys(pasParJour).sort((a, b) => b.localeCompare(a))
    let streakActif = 0
    for (let i = 0; i < joursAvecPas.length; i++) {
      if (pasParJour[joursAvecPas[i]] >= objectifPas) {
        if (i === 0 || streakActif === i) streakActif++
        else break
      } else break
    }

    // Séances cette semaine
    const seancesSemaine = seances?.filter(s => {
      const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 7
    }).length || 0

    return { streak, record, totalJoursReussis, tauxReussite, totalJours: jours.length, streakActif, seancesSemaine }
  console.log('pas dans streak:', pas?.length, joursAvecPas)
  }, [repas, kcalObj, pas, seances, objectifs])

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

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{stats.streak}</div>
          <div className="text-xs text-orange-400 mt-1">jours nutrition 🔥</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-500">{stats.record}</div>
          <div className="text-xs text-purple-400 mt-1">record personnel 🏆</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-500">{stats.streakActif}</div>
          <div className="text-xs text-green-400 mt-1">jours actifs 👟</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{stats.seancesSemaine}</div>
          <div className="text-xs text-blue-400 mt-1">séances cette semaine 🏋️</div>
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
        Un jour est "réussi" quand tu respectes ton budget calorique dynamique (~{kcalObj} kcal en moyenne).
        Tu as réussi <strong className="text-gray-600">{stats.totalJoursReussis} jours</strong> sur {stats.totalJours} jours trackés.
      </div>
    </div>
  )
}