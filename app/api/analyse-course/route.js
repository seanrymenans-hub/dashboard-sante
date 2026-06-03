export async function POST(request) {
  const { courses, repas, objectifs, periode } = await request.json()

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

  const coursesStr = courses.map(c =>
    `${c.date} - ${c.distanceNum}km - ${c.allureStr} - ${c.duree}min - ${c.kcal}kcal`
  ).join('\n')

  const prompt = `Tu es un coach running expert. Analyse les performances de course de cet athlète sur les ${periode} derniers jours.

DONNÉES DE COURSE :
${coursesStr}

NUTRITION MOYENNE SUR LA PÉRIODE :
- Calories moyennes/jour : ${moyKcal} kcal
- Protéines moyennes/jour : ${moyProt}g
- Objectif calorique : ${objectifs?.kcal_journalier || 1850} kcal
- Objectif protéines : ${objectifs?.proteines_objectif || 150}g

Analyse :
1. La progression des performances (allure, distance, volume)
2. La régularité de l'entraînement
3. Le lien entre nutrition et performances
4. Les points forts et axes d'amélioration

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "analyse": "analyse détaillée et personnalisée en 5-6 phrases",
  "points": [
    {"texte": "observation concrète", "positif": true},
    {"texte": "observation concrète", "positif": true},
    {"texte": "axe d'amélioration", "positif": false},
    {"texte": "axe d'amélioration", "positif": false}
  ]
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
        temperature: 0.4
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