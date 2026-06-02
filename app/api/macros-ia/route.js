export async function POST(request) {
  try {
    const { poids, seances, repas, composition, objectifs } = await request.json()

    const poidsActuel = poids?.[0]?.valeur || 82
    const objectifPoids = objectifs?.poids_objectif || 70
    const tmb = objectifs?.tmb || 1875
    const today = new Date().toISOString().split('T')[0]

    // 1. Calories brûlées aujourd'hui (Sport)
    const kcalBruléesAujourdhui = seances
      ? seances.filter(s => s.date === today).reduce((s, r) => s + (r.kcal || 0), 0)
      : 0

    // Moyenne calories brûlées 7 derniers jours
    const seances7j = seances 
      ? seances.filter(s => {
          const diff = (new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24)
          return diff <= 7
        })
      : []
      
    const kcalSportMoyenne = seances7j.length > 0
      ? Math.round(seances7j.reduce((s, r) => s + (r.kcal || 0), 0) / 7)
      : 0

    // 2. CE QUE TU AS DÉJÀ MANGÉ AUJOURD'HUI (La nouveauté !)
    const repasAujourdhui = repas ? repas.filter(r => r.date === today) : []
    const dejaConsomme = {
      kcal: repasAujourdhui.reduce((s, r) => s + (r.kcal || 0), 0),
      proteines: repasAujourdhui.reduce((s, r) => s + (r.proteines || r.macros?.proteines || 0), 0),
      glucides: repasAujourdhui.reduce((s, r) => s + (r.glucides || r.macros?.glucides || 0), 0),
      lipides: repasAujourdhui.reduce((s, r) => s + (r.lipides || r.macros?.lipides || 0), 0),
    }

    // Composition corporelle
    const derniereCompo = composition?.[0]
    const masseMusculaire = derniereCompo?.masse_musculaire || 60

    // prompt mis à jour pour inclure le contexte de ce que tu as mangé !
    const prompt = `Tu es un nutritionniste expert en perte de poids rapide et préservation musculaire. Calcule les macros cibles RESTANTES ou AJUSTÉES pour le reste de la journée.

PROFIL :
- Poids actuel : ${poidsActuel} kg
- Objectif final : ${objectifPoids} kg (perte de poids rapide et sûre)
- TMB : ${tmb} kcal
- Masse musculaire : ${masseMusculaire} kg

ACTIVITÉ ET SPORT :
- Calories brûlées sport aujourd'hui : ${kcalBruléesAujourdhui} kcal
- Moyenne calories sport/jour (7j) : ${kcalSportMoyenne} kcal

CE QUI A DÉJÀ ÉTÉ MANGÉ AUJOURD'HUI :
- Calories consommées : ${dejaConsomme.kcal} kcal
- Protéines consommées : ${dejaConsomme.proteines}g
- Glucides consommés : ${dejaConsomme.glucides}g
- Lipides consommés : ${dejaConsomme.lipides}g

RÈGLES STRICTES :
- Déficit maximum : 750 kcal/jour par rapport aux dépenses totales (TMB + Sport)
- Protéines totales de la journée : minimum 2g par kg de masse musculaire.
- Calories minimum absolues sur la journée : 1200 kcal.
- Analyse ce qui a déjà été mangé. Si l'utilisateur a déjà dépassé ou est proche d'un quota (ex: trop de lipides), ajuste les macros restantes pour compenser et rééquilibrer la journée.

Calcule les macros cibles TOTALES idéales pour cette journée (en prenant en compte cette situation) et explique ton ajustement.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "kcal": <cible_totale_calories_journee>,
  "proteines": <cible_totale_proteines_journee>,
  "glucides": <cible_totale_glucides_journee>,
  "lipides": <cible_totale_lipides_journee>,
  "deficit": <deficit_anticipe_sur_la_journee>,
  "message": "<message de coaching hyper personnalisé qui commente ce qu'il a mangé/fait comme sport aujourd'hui>",
  "ajustement": "<explication de ton calcul mathématique d'adaptation face aux repas et au sport du jour>"
}`

    if (!process.env.GITHUB_TOKEN) {
      throw new Error("La variable GITHUB_TOKEN est manquante.");
    }

    const response = await fetch(
      'https://models.inference.ai.azure.com/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      }
    )

    const rawText = await response.text()
    if (!response.ok) {
      throw new Error(`Erreur GitHub API (${response.status}): ${rawText}`)
    }

    const data = JSON.parse(rawText)
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return Response.json(result)

  } catch (e) {
    console.error('macros-ia error:', e.message, e.stack)
    return Response.json({ error: e.message }, { status: 500 })
  }
}