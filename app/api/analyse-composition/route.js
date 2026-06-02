export async function POST(request) {
  const { composition } = await request.json()

  const derniere = composition?.[0]
  const avant = composition?.[1]

  const diffGrasse = derniere && avant ? (derniere.masse_grasse - avant.masse_grasse).toFixed(1) : null
  const diffMusculaire = derniere && avant ? (derniere.masse_musculaire - avant.masse_musculaire).toFixed(1) : null

  const prompt = `Tu es un expert en composition corporelle. Analyse ces données et donne un bilan personnalisé.

Dernière mesure (${derniere?.date}) :
- Masse grasse : ${derniere?.masse_grasse} kg (${derniere?.masse_grasse_pct}%)
- Masse musculaire : ${derniere?.masse_musculaire} kg (${derniere?.masse_musculaire_pct}%)
- Masse hydrique : ${derniere?.masse_hydrique} kg
- Masse maigre : ${derniere?.masse_maigre} kg
- Masse osseuse : ${derniere?.masse_osseuse} kg

Évolution depuis la dernière mesure :
- Masse grasse : ${diffGrasse ? (diffGrasse > 0 ? '+' : '') + diffGrasse + ' kg' : 'N/A'}
- Masse musculaire : ${diffMusculaire ? (diffMusculaire > 0 ? '+' : '') + diffMusculaire + ' kg' : 'N/A'}

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "analyse": "analyse globale en 2-3 phrases",
  "points": [
    {"texte": "observation positive ou conseil", "positif": true},
    {"texte": "observation positive ou conseil", "positif": true},
    {"texte": "point d'attention ou conseil", "positif": false}
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