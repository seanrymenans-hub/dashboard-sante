'use client'
import { useMemo } from 'react'

export default function Streak({ repas, objectifs, pas, seances, dailyBudgets, budget }) {
  const stats = useMemo(() => {
    // Budget de référence pour chaque jour : on cherche le budget historique
    // sauvegardé pour cette date, avec fallback sur le budget du jour courant
    // si l'historique n'existe pas encore pour cette date (ex: avant migration).
    function getBudgetDuJour(date) {
      const entry = dailyBudgets?.find(b => b.date === date)
      return entry?.budget_jour || budget?.budgetJour || 1800
    }

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
      const kcalObjJour = getBudgetDuJour(jours[i])
      const reussi = parJour[jours[i]] <= kcalObjJour && parJour[jours[i]] > 0
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
  }, [repas, dailyBudgets, budget, pas, seances, objectifs])

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const pasAujourdhui = pas?.find(p => p.date === today)
  const nbPas = pasAujourdhui?.nb_pas || 0
  const objectifPas = objectifs?.objectif_pas || 10000
  const objectifSeances = objectifs?.objectif_seances_semaine || 4

  // Barre de progression — 7 segments représentant les 7 derniers jours,
  // pleins si le streak couvre ce jour, vides sinon (proche du mockup)
  const segments = Array.from({ length: 7 }, (_, i) => i < stats.streak)
  const joursPourBattreRecord = Math.max(0, stats.record - stats.streak + 1)

  return (
    <section className="rounded-[26px] bg-gradient-to-br from-[#16c79a] to-[#13a884] p-[26px_28px] text-white shadow-[0_16px_30px_-16px_rgba(22,199,154,0.6)]">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[13px] font-bold opacity-90 tracking-wide">SÉRIE EN COURS</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[48px] font-extrabold leading-none">{stats.streak}</span>
            <span className="text-[15px] opacity-90">jours réussis</span>
          </div>
        </div>
        <div className="text-4xl">🔥</div>
      </div>

      <div className="flex gap-1.5 mt-7">
        {segments.map((plein, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${plein ? 'bg-white/90' : 'bg-white/30'}`}
          />
        ))}
      </div>

      {stats.streak >= stats.record && stats.record > 0 ? (
        <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 mt-3 text-[13px] font-bold">
          <span>🎉</span>
          <span>Nouveau record personnel !</span>
        </div>
      ) : (
        <div className="text-[13px] opacity-90 mt-3">
          Plus que {joursPourBattreRecord} jour{joursPourBattreRecord > 1 ? 's' : ''} pour battre ton record ({stats.record})
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mt-5 pt-5 border-t border-white/20">
        <div>
          <div className="text-lg font-extrabold">{stats.record}</div>
          <div className="text-[11px] opacity-80 mt-0.5">record personnel</div>
        </div>
        <div>
          <div className="text-lg font-extrabold">{stats.tauxReussite}%</div>
          <div className="text-[11px] opacity-80 mt-0.5">taux de réussite</div>
        </div>
      </div>
    </section>
  )
}
