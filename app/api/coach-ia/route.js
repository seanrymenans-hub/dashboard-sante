export async function POST(request) {
  const { poids, repas, seances, composition, objectifs } = await request.json()

  const today = new Date()
  const lundiDernier = new Date(today)
  lundiDernier.setDate(today.getDate() - today.getDay() + 1)
  const lundiStr = lundiDernier.toISOString().split('T')[0]

  const poidsRecents = poids.slice(0, 7)
  const dernierPoids = poidsRecents[0]?.valeur || 0
  const poidsIlYa7j = poidsRecents[poidsRecents.length - 1]?.valeur || dernierPoids
  const diffPoids = (dernierPoids - poidsIlYa7j).toFixed(1)

  const repasWeek = repas.filter(r => r.date >= lundiStr)
  const kcalMoyenne = repasWeek.length > 0
    ? Math.round(repasWeek.reduce((s, r) => s + r.kcal, 0) / Math.max(1, [...new Set(repasWeek.map(r => r.date))].length))
    : 0

  const seancesWeek = seances.filter(s => {
    const diff = (new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const totalMinSport = seancesWeek.reduce((s, r) => s + r.duree, 0)

  const derniereCompo = composition?.[0]
  const avantCompo = composition?.[1]
  const diffGrasse = derniereCompo && avantCompo
    ? (derniereCompo.masse_grasse - avantCompo.masse_grasse).toFixed(1)
    : null
  const diffMusculaire = derniereCompo && avantCompo
    ? (derniereCompo.masse_musculaire - avantCompo.masse_musculaire).toFixed(1)
    : null

  const prompt = `Tu es un coach personnel expert en perte de poids, nutrition et sport. Voici les données complètes de ton athlète cette semaine :

OBJECTIFS :
- Poids actuel : ${dernierPoids} kg → objectif : ${objectifs?.poids_objectif || 70} kg
- TMB : ${objectifs?.tmb || 1850} kcal
- Objectif calorique : ${objectifs?.kcal_journalier || 1850} kcal/jour

BILAN DE LA SEMAINE :
- Poids : ${diffPoids > 0 ? '+' : ''}${diffPoids} kg (${poidsIlYa7j} → ${dernierPoids} kg)
- Calories moyennes/jour : ${kcalMoyenne} kcal (objectif ${objectifs?.kcal_journalier || 1850})
- Sport : ${seancesWeek.length} séances · ${totalMinSport} min au total
${diffGrasse ? `- Masse grasse : ${diffGrasse > 0 ? '+' : ''}${diffGrasse} kg` : ''}
${diffMusculaire ? `- Masse musculaire : ${diffMusculaire > 0 ? '+' : ''}${diffMusculaire} kg` : ''}

Génère un bilan coach en 3 parties :
1. Un résumé bienveillant de la semaine (2-3 phrases)
2. Ce qui va bien (2 points positifs)
3. 2-3 conseils concrets et personnalisés pour aller plus vite vers l'objectif

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "bilan": "résumé bienveillant de la semaine",
  "positifs": ["point positif 1", "point positif 2"],
  "conseils": [
    {"titre": "titre court", "detail": "conseil concret et personnalisé"},
    {"titre": "titre court", "detail": "conseil concret et personnalisé"},
    {"titre": "titre court", "detail": "conseil concret et personnalisé"}
  ]
}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dashboard-sante-kappa.vercel.app',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
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