'use client'

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)) }

export default function DailyCockpit({ engine, pas, objectifs, seances }) {
  const { budget, macros, progression, tendances, today } = engine
  const repasPct = budget.budgetJour ? clamp(Math.round(budget.kcalConsommees / budget.budgetJour * 100)) : 0
  const pasToday = pas?.find(p => p.date === today)?.nb_pas || 0
  const pasGoal = objectifs?.objectif_pas || 10000
  const pasPct = clamp(Math.round(pasToday / pasGoal * 100))
  const sportToday = seances?.filter(s => s.date === today) || []

  // Protein consumed is not part of the engine's budget object, so derive it from the 7-day signal for guidance only.
  const proteinTarget = macros?.proteines || 0
  const trend = progression?.tendance7j || 0

  const priorities = []
  if (budget.kcalRestantes > 0) priorities.push(`${budget.kcalRestantes} kcal disponibles pour finir la journée`)
  else if (budget.surplusOuDeficit > 0) priorities.push(`Budget dépassé de ${Math.round(budget.surplusOuDeficit)} kcal — pas besoin de compenser brutalement`)
  if (pasToday < pasGoal) priorities.push(`${(pasGoal - pasToday).toLocaleString('fr-FR')} pas pour atteindre ton objectif`)
  else priorities.push(`Objectif de pas atteint — ${pasToday.toLocaleString('fr-FR')} pas`)
  if (sportToday.length) priorities.push(`${sportToday.length} séance${sportToday.length > 1 ? 's' : ''} enregistrée${sportToday.length > 1 ? 's' : ''} aujourd'hui`)
  else priorities.push(`Aucune séance enregistrée aujourd'hui`)

  return (
    <section className="cockpit-card">
      <div className="cockpit-topline">
        <div>
          <div className="eyebrow">Aujourd'hui</div>
          <h2>Ton tableau de bord, en un coup d'œil.</h2>
        </div>
        <div className="status-pill"><span className="status-dot" /> Données chargées</div>
      </div>

      <div className="cockpit-grid">
        <div className="cockpit-primary">
          <div className="ring" style={{ '--progress': `${repasPct * 3.6}deg` }}>
            <div className="ring-inner"><strong>{budget.kcalRestantes}</strong><span>kcal restantes</span></div>
          </div>
          <div>
            <div className="metric-kicker">Budget énergie</div>
            <div className="metric-main">{budget.kcalConsommees.toLocaleString('fr-FR')} <span>kcal consommées</span></div><div className="metric-subline">Budget du jour · {budget.budgetJour.toLocaleString('fr-FR')} kcal</div>
            <div className="metric-caption">Dépense estimée {budget.depenseTotal.toLocaleString('fr-FR')} kcal · déficit cible {budget.deficitCible} kcal</div>
          </div>
        </div>

        <div className="cockpit-stat">
          <div className="metric-kicker">Pas</div>
          <div className="metric-main">{pasToday.toLocaleString('fr-FR')}</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pasPct}%` }} /></div>
          <div className="metric-caption">{pasPct}% de {pasGoal.toLocaleString('fr-FR')}</div>
        </div>

        <div className="cockpit-stat">
          <div className="metric-kicker">Poids</div>
          <div className="metric-main">{progression.poidsActuel || '—'} <span>kg</span></div>
          <div className={`trend ${trend <= 0 ? 'good' : ''}`}>{trend === 0 ? 'Tendance en construction' : `${trend > 0 ? '+' : ''}${trend} kg/semaine`}</div>
          <div className="metric-caption">Objectif {progression.poidsObjectif} kg · {progression.progressionPct}% atteint</div>
        </div>

        <div className="cockpit-stat">
          <div className="metric-kicker">Régularité</div>
          <div className="metric-main">{tendances.joursSuivis7j ? `${tendances.pctRespect7j}%` : '—'}</div>
          <div className="metric-caption">{tendances.joursSuivis7j ? `${tendances.joursRespectés7j}/${tendances.joursSuivis7j} jours suivis dans le budget` : 'Pas encore assez de jours nutrition suivis'} · cible protéines {proteinTarget} g</div>
        </div>
      </div>

      <div className="priority-strip">
        <div className="priority-title">Priorités du jour <span>sans IA</span></div>
        <div className="priority-items">
          {priorities.slice(0,3).map((p, i) => <div className="priority-item" key={i}><span>{i + 1}</span>{p}</div>)}
        </div>
      </div>
    </section>
  )
}
