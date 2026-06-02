export async function POST(request) {
  const { poids, seances, repas, composition, objectifs } = await request.json()

  const poidsActuel = poids?.[0]?.valeur || 82
  const objectifPoids = objectifs?.poids_objectif || 70
  const tmb = objectifs?.tmb || 1875
  const today = new Date().toISOString().split('T')[0]

  // Calories brûlées aujourd'hui
  const kcalBruléesAujourdhui = seances
    .filter(s => s.date === today)
    .reduce((s, r) => s + (r.kcal || 0), 0)

  // Moyenne calories brûlées 7 derniers jours
  const seances7j = seances.filter(s => {
    const diff = (new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const kcalSportMoyenne = seances7j.length > 0
    ? Math.round(seances7j.reduce((s, r) => s + (r.kcal || 0), 0) / 7)
    : 0

  // Composition corporelle
  const derniereCompo = composition?.[0]
  const masseMusculaire = derniereCompo?.masse_musculaire || 60

  const prompt = `Tu es un nutritionniste expert en perte de poids rapide et préservation musculaire. Calcule les macros optimales pour aujourd'hui.

PROFIL :
- Poids actuel : ${poidsActuel} kg
- Objectif : ${objectifPoids} kg (perte de poids la plus rapide possible sans danger)
- TMB : ${tmb} kcal
- Masse musculaire : ${masseMusculaire} kg

ACTIVITÉ D'AUJOURD'HUI :
- Calories brûlées sport aujourd'hui : ${kcalBruléesAujourdhui} kcal
- Moyenne calories sport/jour (7j) : ${kcalSportMoyenne} kcal

RÈGLES STRICTES :
- Déficit maximum : 750 kcal/jour (sécurité)
- Protéines : minimum 2g par kg de masse musculaire pour préserver le muscle
- Si sport aujourd'hui : augmenter légèrement les glucides pour la récupération
- Calories minimum absolues : 1200 kcal/jour

Calcule les macros idéales pour aujourd'hui et explique pourquoi.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "kcal": <ta_valeur_calculée>,
  "proteines": <ta_valeur_calculée>,
  "glucides": <ta_valeur_calculée>,
  "lipides": <ta_valeur_calculée>,
  "deficit": <ta_valeur_calculée>,
  "message": "<message motivant personnalisé basé sur les données>",
  "ajustement": "<explication pourquoi ces macros précises aujourd'hui>"
}`

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
        temperature: 0.3
      })
    })
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return Response.json(result)
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}