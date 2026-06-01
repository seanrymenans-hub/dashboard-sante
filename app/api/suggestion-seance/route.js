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

  const dernièresSeances = seances.slice(0, 7).map(s =>
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

BILAN DU JOUR :
- Calories consommées : ${kcalAujourdhui} kcal
- Calories brûlées via sport : ${kcalBrulees} kcal
- Bilan calorique net : ${bilanCalorique} kcal
- Objectif calorique : ${kcalObj} kcal

HISTORIQUE DES 7 DERNIÈRES SÉANCES :
${dernièresSeances || 'Aucune séance récente'}

HISTORIQUE DE COURSE DÉTAILLÉ :
${courseHistory || 'Aucune course récente'}

En tenant compte de tout cela :
- Si tu proposes une COURSE : donne une distance cible, une allure cible en min/km basée sur l'historique, et un plan de séance détaillé (échauffement, intervalles ou endurance, retour au calme)
- Si tu proposes du RENFORCEMENT : uniquement exercices au poids du corps, pas d'haltères ni matériel

Réponds UNIQUEMENT en JSON valide sans markdown :
{"type":"course ou renforcement","titre":"nom de la séance","duree":30,"intensite":"légère ou modérée ou intense","raison":"explication courte en 1-2 phrases basée sur les données réelles","exercices":[{"nom":"exercice ou étape","series":"ex: 3x15 ou 2km à 5min30/km"}]}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    })

    const data = await response.json()
    console.log('OpenRouter response:', JSON.stringify(data))
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const suggestion = JSON.parse(clean)
    return Response.json({ suggestion })
  } catch(e) {
    console.log('Error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}