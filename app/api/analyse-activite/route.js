export async function POST(request) {
  try {
    const { seances = [], repas = [], objectifs, periode, macros } = await request.json()

    const datesNutrition = [...new Set(repas.map(r => r.date))]
    const nutritionDisponible = datesNutrition.length >= 2
    const moyKcal = nutritionDisponible ? Math.round(datesNutrition.reduce((s, date) => s + repas.filter(r => r.date === date).reduce((ss, r) => ss + (r.kcal || 0), 0), 0) / datesNutrition.length) : null
    const moyProt = nutritionDisponible ? Math.round(datesNutrition.reduce((s, date) => s + repas.filter(r => r.date === date).reduce((ss, r) => ss + (r.proteines || 0), 0), 0) / datesNutrition.length) : null

    const totalMin = seances.reduce((s,r) => s + (Number(r.duree)||0),0)
    const totalKcal = seances.reduce((s,r) => s + (Number(r.kcal)||0),0)
    const nbCourse = seances.filter(s=>s.type==='course').length
    const nbRenfo = seances.filter(s=>s.type==='renforcement').length
    const nbAutre = seances.filter(s=>s.type==='autre').length
    const totalKm = Math.round(seances.filter(s=>s.type==='course').reduce((s,r)=>s+(Number(r.distance)||0),0)*10)/10
    const seancesStr = seances.map(s => `${s.date} - ${s.type.toUpperCase()} - ${s.nom} - ${s.duree}min - ${s.kcal}kcal${s.distance ? ` - ${s.distance}km` : ''}${s.notes ? ` - ${s.notes}` : ''}`).join('\n')

    const prompt = `Tu es le coach sportif de Health Engine. Tu tutoies toujours l'utilisateur. Ton rôle est d'interpréter ses entraînements avec rigueur, pas d'inventer des informations absentes.

RÈGLES DE FIABILITÉ :
- Une séance non enregistrée n'est pas une preuve que la personne n'a pas bougé.
- Si la nutrition n'a pas été suivie au moins 2 jours, dis "nutrition insuffisamment suivie" et NE transforme jamais cela en 0 kcal ou 0 g de protéines.
- Ne diagnostique pas de surentraînement sans signaux concrets dans les données.
- Ne réduis pas automatiquement le volume "par prudence". Maintiens ou fais progresser légèrement si l'historique le justifie.
- Ne présente pas la charge calculée comme une mesure médicale ou Garmin : reste sur une lecture pratique du volume et de la régularité.
- Donne des recommandations réalisables dans Health Engine. Le renforcement disponible est au poids du corps à la maison ; la course se fait en extérieur.

PÉRIODE : ${periode} jours
ACTIVITÉ ENREGISTRÉE :
- ${seances.length} séance(s), ${totalMin} minutes, ${totalKcal} kcal sport
- ${nbCourse} course(s), ${nbRenfo} renforcement, ${nbAutre} autre(s)
- ${totalKm} km de course cumulés

DÉTAIL :
${seancesStr || 'Aucune séance enregistrée.'}

NUTRITION :
- Disponibilité : ${nutritionDisponible ? `${datesNutrition.length} jours suivis` : 'insuffisamment suivie'}
- Calories moyennes : ${moyKcal === null ? 'inconnu' : `${moyKcal} kcal/j`}
- Protéines moyennes : ${moyProt === null ? 'inconnu' : `${moyProt} g/j`}
- Cible protéines : ${macros?.proteines || objectifs?.proteines_objectif || 'inconnue'} g/j

Analyse :
1. la régularité et le volume d'entraînement ;
2. l'équilibre course / renforcement / autre ;
3. la progression observable sans surinterpréter ;
4. la nutrition seulement si les données sont suffisantes ;
5. propose 3 à 4 activités pour la semaine suivante, cohérentes avec le volume déjà observé.

Le texte doit ressembler à un coach premium : analytique, humain, précis, pas alarmiste. Si la période contient peu de données, dis-le une fois puis concentre-toi sur ce qui peut réellement être conclu.

Réponds UNIQUEMENT en JSON valide :
{"analyse":"5-7 phrases","points":[{"texte":"observation concrète","positif":true},{"texte":"observation ou axe concret","positif":false}],"semaineProchaine":[{"jour":"Lundi","activite":"activité + volume précis","raison":"raison courte basée sur les données"}]}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5-mini', messages: [{ role: 'user', content: prompt }] })
    })
    const data = await response.json()
    if (!response.ok) {
      console.error('OpenAI status:', response.status, 'body:', JSON.stringify(data))
      return Response.json({ error: data?.error?.message || 'OpenAI error' }, { status: response.status })
    }
    const text = data.choices?.[0]?.message?.content || ''
    const result = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json(result)
  } catch (e) {
    console.error('Erreur analyse-activite:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
