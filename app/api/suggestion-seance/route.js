export async function POST(request) {
  const { seances, repas, poids } = await request.json()

  const today = new Date().toISOString().split('T')[0]
  const kcalAujourdhui = repas
    .filter(r => r.date === today)
    .reduce((s, r) => s + r.kcal, 0)

  const dernierPoids = poids?.[0]?.valeur || 'inconnu'
  const dernièresSeances = seances.slice(0, 5).map(s =>
    `${s.date} - ${s.type} - ${s.nom} - ${s.duree}min - ${s.kcal}kcal`
  ).join('\n')

  const prompt = `Tu es un coach sportif. Propose UNE séance pour aujourd'hui.
Poids : ${dernierPoids} kg, objectif 78 kg
Calories aujourd'hui : ${kcalAujourdhui} kcal
Dernières séances : ${dernièresSeances || 'aucune'}
Réponds UNIQUEMENT en JSON valide sans markdown :
{"type":"course ou renforcement","titre":"nom","duree":30,"intensite":"légère","raison":"raison courte","exercices":[{"nom":"exercice","series":"3x15"}]}`

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