export async function POST(request) {
  const { repas, objectifs, tendances, budgetMoyen7j, macros } = await request.json()

  const prompt = `Tu es un expert en nutrition. Analyse les habitudes alimentaires de cet utilisateur.

IMPORTANT : Le budget calorique de cet utilisateur est DYNAMIQUE — il varie chaque jour selon ses pas, son sport et son TMB.
Le budget calorique moyen estimé est de ${budgetMoyen7j} kcal/jour (TMB + effet thermique - déficit cible).
Compare toujours les calories consommées à ce budget moyen de ${budgetMoyen7j} kcal, pas au TMB seul.

OBJECTIFS NUTRITIONNELS (calculés dynamiquement selon le poids et le budget actuels) :
- Protéines : ${macros?.proteines || objectifs?.proteines_objectif || 150}g/jour
- Glucides : ${macros?.glucides || objectifs?.glucides_objectif || 200}g/jour
- Lipides : ${macros?.lipides || objectifs?.lipides_objectif || 60}g/jour
- TMB : ${objectifs?.tmb || 1875} kcal
- Déficit cible : ${objectifs?.deficit_cible || 750} kcal/jour

DONNÉES RÉELLES (7 derniers jours) :
- Moyenne calories consommées : ${tendances?.moyKcal7j || 0} kcal/jour
- Moyenne protéines : ${tendances?.moyProt7j || 0}g/jour
- Moyenne glucides : ${tendances?.moyGluc7j || 0}g/jour
- Moyenne lipides : ${tendances?.moyLip7j || 0}g/jour
- Jours dans l'objectif sur 7j : ${tendances?.pctRespect7j || 0}%
- Jours dans l'objectif sur 30j : ${tendances?.pctRespect30j || 0}%

Génère une analyse nutritionnelle personnalisée et concrète.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "bilan": "analyse des habitudes en 2-3 phrases, mentionne les vraies données",
  "positifs": ["point positif concret 1", "point positif concret 2"],
  "conseils": [
    {"titre": "titre court", "detail": "conseil nutritionnel concret et personnalisé"},
    {"titre": "titre court", "detail": "conseil nutritionnel concret et personnalisé"}
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
        temperature: 0.5
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