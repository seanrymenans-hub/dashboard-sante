export async function POST(request) {
  try {
    const { seances = [], repas = [], objectifs, periode, macros } = await request.json()

    const moyKcal = repas.length > 0
      ? Math.round([...new Set(repas.map(r => r.date))].reduce((s, date) => {
          return s + repas.filter(r => r.date === date).reduce((ss, r) => ss + r.kcal, 0)
        }, 0) / [...new Set(repas.map(r => r.date))].length)
      : 0

    const moyProt = repas.length > 0
      ? Math.round([...new Set(repas.map(r => r.date))].reduce((s, date) => {
          return s + repas.filter(r => r.date === date).reduce((ss, r) => ss + (r.proteines || 0), 0)
        }, 0) / [...new Set(repas.map(r => r.date))].length)
      : 0

    // Format texte adapté à chaque type de séance — les courses gardent
    // distance/allure (extraites des notes), le renforcement garde les
    // groupes/exercices, "autre" reste minimal.
    const seancesStr = seances.map(s => {
      if (s.type === 'course') {
        return `${s.date} - COURSE - ${s.nom} - ${s.distance || 0}km - ${s.duree}min - ${s.kcal}kcal${s.notes ? ` - ${s.notes}` : ''}`
      }
      if (s.type === 'renforcement') {
        return `${s.date} - RENFORCEMENT - ${s.nom} - ${s.duree}min - ${s.kcal}kcal${s.notes ? ` - ${s.notes}` : ''}`
      }
      return `${s.date} - AUTRE (${s.nom}) - ${s.duree}min - ${s.kcal}kcal`
    }).join('\n')

    const totalSeances = seances.length
    const totalMin = seances.reduce((s, r) => s + (r.duree || 0), 0)
    const totalKcal = seances.reduce((s, r) => s + (r.kcal || 0), 0)
    const nbCourse = seances.filter(s => s.type === 'course').length
    const nbRenfo = seances.filter(s => s.type === 'renforcement').length
    const nbAutre = seances.filter(s => s.type === 'autre').length

    const prompt = `Tu es un coach sportif généraliste. Analyse l'activité physique complète de cette personne sur les ${periode} derniers jours — pas seulement la course, mais TOUT son sport (course, renforcement musculaire, autres activités comme le tennis).

RÉSUMÉ DE LA PÉRIODE :
- ${totalSeances} séances au total (${nbCourse} course(s), ${nbRenfo} renforcement, ${nbAutre} autre(s))
- ${totalMin} minutes d'activité cumulées
- ${totalKcal} kcal dépensées en activité sportive

DÉTAIL DES SÉANCES :
${seancesStr || 'Aucune séance enregistrée sur cette période.'}

NUTRITION MOYENNE SUR LA PÉRIODE :
- Calories moyennes/jour : ${moyKcal} kcal
- Protéines moyennes/jour : ${moyProt}g
- Objectif calorique (dynamique, varie selon l'activité du jour) : ${objectifs?.kcal_journalier || 1850} kcal
- Objectif protéines (2g/kg de poids actuel) : ${macros?.proteines || objectifs?.proteines_objectif || 150}g

Analyse :
1. L'équilibre entre les différents types d'activité (cardio vs renforcement vs autre) — y a-t-il un déséquilibre notable ?
2. La régularité et la fréquence de l'entraînement sur la période
3. Le lien entre nutrition (notamment apport protéique) et soutien de l'activité physique
4. Les points forts et axes d'amélioration concrets

Puis propose un plan concret de 3 à 4 activités pour LA SEMAINE PROCHAINE, qui comble les manques identifiés
(par exemple : si tu vois beaucoup de course et peu de renforcement, propose plus de renforcement).

PRINCIPE IMPORTANT : le but par défaut est de MAINTENIR OU AUGMENTER le niveau d'activité de la semaine
précédente, pas de le réduire par précaution. Reprends les distances/durées déjà observées dans les séances
ci-dessus comme référence de volume habituel (ex: si la personne a couru 7km cette semaine, ne propose pas
une course "légère" à 5km sans raison — propose plutôt de maintenir ~7km ou de progresser légèrement).
Ne propose un volume plus léger ou un jour de repos supplémentaire QUE s'il y a un signe clair de
surentraînement dans les données (plusieurs séances très rapprochées dans le temps, ou intensité déjà très
élevée plusieurs jours d'affilée) — pas par défaut. Si le déficit nutritionnel observé est notable, mentionne-le
comme point d'attention dans "raison" plutôt que comme prétexte pour réduire l'activité physique.

Pour le renforcement, regarde les groupes musculaires déjà mentionnés dans les notes des séances ci-dessus
et propose des groupes différents ou complémentaires plutôt que de répéter exactement les mêmes.

Chaque proposition doit avoir un jour de la semaine (lundi à dimanche), une activité concrète avec un volume
cohérent avec l'historique (distance/durée si pertinent), et une raison courte basée sur l'analyse.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "analyse": "analyse détaillée et personnalisée en 5-6 phrases, qui parle de l'ensemble de l'activité et pas seulement de la course",
  "points": [
    {"texte": "observation concrète", "positif": true},
    {"texte": "observation concrète", "positif": true},
    {"texte": "axe d'amélioration", "positif": false},
    {"texte": "axe d'amélioration", "positif": false}
  ],
  "semaineProchaine": [
    {"jour": "Lundi", "activite": "Renforcement haut du corps", "raison": "Peu de renfo cette semaine, à rééquilibrer"},
    {"jour": "Mercredi", "activite": "Course 7km", "raison": "Maintenir le volume de course de la semaine passée"},
    {"jour": "Vendredi", "activite": "Renforcement bas du corps", "raison": "Compléter le travail musculaire de la semaine"}
  ]
}`

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4
      })
    })
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return Response.json(result)
  } catch (e) {
    console.error('Erreur analyse-activite:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}