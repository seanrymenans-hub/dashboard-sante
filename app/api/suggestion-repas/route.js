export async function POST(request) {
  const { repas, objectifs, composition, poids } = await request.json()

  const today = new Date().toISOString().split('T')[0]
  const repasAujourdhui = repas.filter(r => r.date === today)
  
  const kcalMange = repasAujourdhui.reduce((s, r) => s + r.kcal, 0)
  const protMange = repasAujourdhui.reduce((s, r) => s + (r.proteines || 0), 0)
  const carbMange = repasAujourdhui.reduce((s, r) => s + (r.glucides || 0), 0)
  const lipMange = repasAujourdhui.reduce((s, r) => s + (r.lipides || 0), 0)

  const kcalObj = objectifs?.kcal_journalier || 1850
  const dernierPoids = poids?.[0]?.valeur || 82.3
  const objectifPoids = objectifs?.poids_objectif || 70
  const tmb = objectifs?.tmb || 1850
  const derniereCompo = composition?.[0]

  const repasLog = repasAujourdhui.map(r => `${r.type}: ${r.nom} (${r.kcal} kcal, P${r.proteines}g G${r.glucides}g L${r.lipides}g)`).join('\n')

  const prompt = `Tu es un nutritionniste expert en perte de poids et composition corporelle. Voici le profil de ton patient :

PROFIL :
- Poids actuel : ${dernierPoids} kg, objectif : ${objectifPoids} kg
- TMB : ${tmb} kcal/jour
- Objectif calorique : ${kcalObj} kcal/jour

COMPOSITION CORPORELLE :
- Masse grasse : ${derniereCompo?.masse_grasse || '?'} kg (${derniereCompo?.masse_grasse_pct || '?'}%)
- Masse musculaire : ${derniereCompo?.masse_musculaire || '?'} kg (${derniereCompo?.masse_musculaire_pct || '?'}%)
- Masse hydrique : ${derniereCompo?.masse_hydrique || '?'} kg

BILAN ALIMENTAIRE DU JOUR :
${repasLog || 'Aucun repas enregistré'}

Calories consommées : ${kcalMange} / ${kcalObj} kcal
Protéines : ${Math.round(protMange)}g / ${objectifs?.proteines_objectif || 150}g
Glucides : ${Math.round(carbMange)}g / ${objectifs?.glucides_objectif || 250}g
Lipides : ${Math.round(lipMange)}g / ${objectifs?.lipides_objectif || 67}g

Calories restantes : ${kcalObj - kcalMange} kcal

Propose 2 options de repas pour compléter la journée en tenant compte des macros manquantes, de l'objectif de perte de poids et de la composition corporelle. Pas de contraintes alimentaires.

Réponds UNIQUEMENT en JSON valide sans markdown :
{"suggestions":[{"nom":"nom du repas","description":"description courte","kcal":300,"proteines":30,"glucides":20,"lipides":10,"ingredients":["ingredient 1","ingredient 2"],"raison":"pourquoi ce repas est adapté"},{"nom":"nom du repas 2","description":"description courte","kcal":300,"proteines":30,"glucides":20,"lipides":10,"ingredients":["ingredient 1","ingredient 2"],"raison":"pourquoi ce repas est adapté"}]}`

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
    const result = JSON.parse(clean)
    return Response.json(result)
  } catch(e) {
    console.log('Error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}