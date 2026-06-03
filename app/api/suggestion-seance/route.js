export async function POST(request) {
  const { seances, repas, poids, objectifs } = await request.json()

  const today = new Date().toISOString().split('T')[0]
  const kcalAujourdhui = repas
    .filter(r => r.date === today)
    .reduce((s, r) => s + r.kcal, 0)

  const kcalBrulees = seances
    .filter(s => s.date === today)
    .reduce((s, r) => s + (r.kcal || 0), 0)

  const tmb = objectifs?.tmb || 1850
  const objectifPoids = objectifs?.poids_objectif || 70
  const dernierPoids = poids?.[0]?.valeur || 'inconnu'
  const kcalObj = objectifs?.kcal_journalier || 1850
  const bilanCalorique = kcalAujourdhui - kcalBrulees - tmb

  const dernièreSeanceDate = seances?.[0]?.date
  const joursDepuisDerniereSeance = dernièreSeanceDate
    ? Math.floor((new Date().getTime() - new Date(dernièreSeanceDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const groupesMusculairesRecents = seances.slice(0, 3)
    .map(s => s.notes).filter(Boolean).join(', ')
  const courses21j = seances.filter(s => {
    const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
    return s.type === 'course' && diff <= 21
  })
  const moyDistanceCourse = courses21j.length > 0
    ? Math.round(courses21j.reduce((s, r) => s + (r.distance || 0), 0) / courses21j.length * 10) / 10
    : null
  const moyDureeCourse = courses21j.length > 0
    ? Math.round(courses21j.reduce((s, r) => s + r.duree, 0) / courses21j.length)
    : null

  const dernièresSeances = seances.slice(0, 10).map(s =>
    `${s.date} - ${s.type} - ${s.nom} - ${s.duree}min - ${s.kcal}kcal${s.notes ? ' - muscles: ' + s.notes : ''}`
  ).join('\n')

  const courseHistory = seances
    .filter(s => s.type === 'course')
    .slice(0, 5)
    .map(s => `${s.date} - ${s.duree}min - ${s.distance || '?'}km - ${s.kcal}kcal`)
    .join('\n')

  const prompt = `Tu es un coach sportif expert en perte de poids et en course à pied. Voici le profil complet de ton athlète :

PROFIL :
- Poids actuel : ${dernierPoids} kg
- Objectif : ${objectifPoids} kg
- TMB (taux métabolique de base) : ${tmb} kcal/jour
- Équipement disponible : UNIQUEMENT poids du corps à la maison pour le renforcement, et course en extérieur
- Jours depuis la dernière séance : ${joursDepuisDerniereSeance !== null ? joursDepuisDerniereSeance + ' jour(s)' : 'inconnu'}
- Groupes musculaires travaillés récemment : ${groupesMusculairesRecents || 'inconnu'}
- Moyenne distance courses (21j) : ${moyDistanceCourse ? moyDistanceCourse + ' km' : 'inconnu'}
- Moyenne durée courses (21j) : ${moyDureeCourse ? moyDureeCourse + ' min' : 'inconnu'}
- Nombre de courses sur 21j : ${courses21j.length}

BILAN DU JOUR :
- Calories consommées : ${kcalAujourdhui} kcal
- Calories brûlées via sport : ${kcalBrulees} kcal
- Bilan calorique net : ${bilanCalorique} kcal
- Objectif calorique : ${kcalObj} kcal

RÉCUPÉRATION :
- Jours depuis la dernière séance : ${joursDepuisDerniereSeance !== null ? joursDepuisDerniereSeance + ' jour(s)' : 'inconnu'}
- Groupes musculaires travaillés récemment : ${groupesMusculairesRecents || 'inconnu'}

HISTORIQUE DES 7 DERNIÈRES SÉANCES :
${dernièresSeances || 'Aucune séance récente'}

HISTORIQUE DE COURSE DÉTAILLÉ :
${courseHistory || 'Aucune course récente'}

En tenant compte de tout cela :
- Propose ce qui est VRAIMENT optimal pour cet athlète aujourd'hui — pas de durée fixe, base-toi sur son historique réel
- Si tu proposes une COURSE : base la distance ET la durée sur sa moyenne des 21 derniers jours, donne une allure cible précise en min/km, et détaille le plan (échauffement, corps de séance, retour au calme)
- Si tu proposes du RENFORCEMENT : uniquement poids du corps, détaille chaque exercice avec séries/reps et temps de repos
- Donne une explication détaillée et personnalisée (5-6 phrases) qui explique pourquoi cette séance précisément aujourd'hui

Réponds UNIQUEMENT en JSON valide sans markdown :
{"type":"[course ou renforcement]","titre":"[nom de la séance]","duree":[nombre de minutes calculé],"distance":[km calculés sur base de l'historique, null si renforcement],"allure":"[min/km calculé sur base de l'historique, null si renforcement]","intensite":"[légère ou modérée ou intense]","groupesCibles":["[groupes musculaires ciblés, vide si course]"],"raison":"[explication détaillée et personnalisée 5-6 phrases]","exercices":[{"nom":"[nom exercice ou étape]","series":"[séries x reps ou distance x allure]","repos":"[temps de repos]"}]}`

  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const suggestion = JSON.parse(clean)
    return Response.json({ suggestion })
  } catch(e) {
    console.log('Error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}