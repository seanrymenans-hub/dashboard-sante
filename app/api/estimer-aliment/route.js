export async function POST(request) {
  const { aliment } = await request.json()

  const prompt = `Tu es un nutritionniste expert avec une base de données nutritionnelle précise. Estime les macros pour cet aliment.

Aliment : "${aliment}"

RÈGLES STRICTES :
- Utilise les valeurs nutritionnelles officielles (Ciqual, USDA)
- Si quantité précisée (ex: "200g poulet") → calcule exactement pour cette quantité
- Si pas de quantité → utilise une portion standard réaliste et précise-la dans le nom
- Tiens compte du mode de cuisson si précisé (grillé, frit, vapeur changent les valeurs)
- Pour les plats composés, décompose et additionne chaque ingrédient
- Sois précis : ne pas arrondir excessivement

EXEMPLES DE PRÉCISION ATTENDUE :
- "100g poulet grillé" → kcal: 165, proteines: 31, glucides: 0, lipides: 4
- "1 œuf entier" → kcal: 78, proteines: 6, glucides: 1, lipides: 5
- "100g riz cuit" → kcal: 130, proteines: 3, glucides: 28, lipides: 0

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "nom": "nom descriptif avec quantité précise",
  "kcal": <entier>,
  "proteines": <entier>,
  "glucides": <entier>,
  "lipides": <entier>,
  "note": "portion estimée à Xg" (seulement si quantité non précisée)
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
        temperature: 0.1
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