export async function POST(request) {
  const body = await request.json()
  const { courses = [], repas = [], objectifs, periode = 30, macros, mode, course } = body

  const datesNutrition = [...new Set((repas || []).map(r => r.date))]
  const nutritionDisponible = datesNutrition.length >= 2
  const moyKcal = nutritionDisponible
    ? Math.round(datesNutrition.reduce((s, date) => s + repas.filter(r => r.date === date).reduce((ss, r) => ss + (r.kcal || 0), 0), 0) / datesNutrition.length)
    : null
  const moyProt = nutritionDisponible
    ? Math.round(datesNutrition.reduce((s, date) => s + repas.filter(r => r.date === date).reduce((ss, r) => ss + (r.proteines || 0), 0), 0) / datesNutrition.length)
    : null

  const coursesStr = courses.map(c =>
    `${c.date} - ${c.distanceNum ?? c.distance ?? 0}km - ${c.allureStr || 'allure inconnue'} - ${c.duree}min - ${c.kcal}kcal`
  ).join('\n')

  const singleMode = mode === 'single' && course
  const prompt = singleMode
    ? `Tu es le coach running de Health Engine. Tu tutoies l'utilisateur. Analyse UNE sortie précise en la comparant seulement à l'historique réellement disponible.

RÈGLES :
- Ne prétends pas disposer de splits, fréquence cardiaque, dénivelé ou ressenti s'ils ne sont pas fournis.
- Une différence isolée ne prouve pas une progression durable.
- Sois concret sur distance, durée et allure moyenne.
- Si l'historique est trop court, dis-le une fois puis concentre-toi sur ce qui est comparable.
- Aucun conseil médical.

SORTIE À ANALYSER :
${course.date} - ${course.distanceNum ?? course.distance ?? 0} km - ${course.allureStr || 'allure inconnue'} - ${course.duree} min - ${course.kcal} kcal

HISTORIQUE DE LA PÉRIODE (${periode} jours) :
${coursesStr || 'Aucune autre course disponible.'}

Réponds UNIQUEMENT en JSON valide :
{"analyse":"4-6 phrases, personnalisées et utiles","points":[{"texte":"observation concrète","positif":true},{"texte":"axe ou nuance concrète","positif":false}]}`
    : `Tu es un coach running expert de Health Engine. Tu tutoies l'utilisateur et analyses ses performances sur les ${periode} derniers jours.

RÈGLES :
- N'invente pas de données absentes.
- Si la nutrition n'est pas suivie au moins 2 jours, traite-la comme inconnue et n'en tire aucune conclusion.
- Ne transforme pas une seule bonne sortie en preuve de progression durable.
- Distingue clairement volume, allure moyenne et régularité.

DONNÉES DE COURSE :
${coursesStr || 'Aucune course disponible.'}

NUTRITION : ${nutritionDisponible ? `${datesNutrition.length} jours suivis, ${moyKcal} kcal/j et ${moyProt} g protéines/j en moyenne` : 'insuffisamment suivie / inconnue'}
Objectif protéines : ${macros?.proteines || objectifs?.proteines_objectif || 'inconnu'} g/j

Réponds UNIQUEMENT en JSON valide :
{"analyse":"analyse détaillée et personnalisée en 5-6 phrases","points":[{"texte":"observation concrète","positif":true},{"texte":"observation concrète","positif":true},{"texte":"axe d'amélioration","positif":false}]}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        messages: [{ role: 'user', content: prompt }],
      })
    })
    const data = await response.json()
    if (!response.ok) {
      console.error('OpenAI status:', response.status, 'body:', JSON.stringify(data))
      return Response.json({ error: data?.error?.message || 'OpenAI error' }, { status: response.status })
    }
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return Response.json(result)
  } catch(e) {
    console.error('Erreur analyse-course:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
