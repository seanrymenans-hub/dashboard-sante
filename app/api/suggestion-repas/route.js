export async function POST(request) {
  const {
    repas, objectifs, composition, poids, preferences,
    kcalRestant, protRestant, carbRestant, lipRestant,
  } = await request.json()

  const today = new Date().toISOString().split('T')[0]
  const repasAujourdhui = repas.filter(r => r.date === today)

  const dernierPoids = poids?.[0]?.valeur || 82.3
  const objectifPoids = objectifs?.poids_objectif || 70
  const derniereCompo = composition?.[0]

  const repasLog = repasAujourdhui.map(r => `${r.type}: ${r.nom} (${r.kcal} kcal, P${r.proteines}g G${r.glucides}g L${r.lipides}g)`).join('\n')

  // Fallback si jamais le client n'a pas envoyé les valeurs calculées
  // (ne devrait pas arriver en usage normal, sécurité supplémentaire seulement)
  const kcalRestantFinal = kcalRestant ?? 500
  const protRestantFinal = protRestant ?? 30
  const carbRestantFinal = carbRestant ?? 40
  const lipRestantFinal = lipRestant ?? 15

  const prompt = `Tu es un nutritionniste expert en perte de poids et composition corporelle. Voici le profil de ton patient :

PROFIL :
- Poids actuel : ${dernierPoids} kg, objectif : ${objectifPoids} kg

COMPOSITION CORPORELLE :
- Masse grasse : ${derniereCompo?.masse_grasse || '?'} kg (${derniereCompo?.masse_grasse_pct || '?'}%)
- Masse musculaire : ${derniereCompo?.masse_musculaire || '?'} kg (${derniereCompo?.masse_musculaire_pct || '?'}%)
- Masse hydrique : ${derniereCompo?.masse_hydrique || '?'} kg

BILAN ALIMENTAIRE DU JOUR :
${repasLog || 'Aucun repas enregistré'}

IL RESTE EXACTEMENT POUR AUJOURD'HUI (déjà calculé, fais confiance à ces chiffres) :
- ${kcalRestantFinal} kcal
- ${protRestantFinal}g de protéines
- ${carbRestantFinal}g de glucides
- ${lipRestantFinal}g de lipides

${preferences ? `PRÉFÉRENCES ALIMENTAIRES DE L'UTILISATEUR :\n${preferences}\n` : 'Pas de contraintes alimentaires particulières.'}

Propose 2 options de repas pour compléter la journée. Chaque suggestion doit avoir un total calorique proche du restant disponible ci-dessus (entre 70% et 100% du kcal restant, jamais plus), et respecter au mieux les macros manquantes. Si le kcal restant est très faible (moins de 150 kcal), propose plutôt une collation légère adaptée à ce budget réduit. Tiens compte de l'objectif de perte de poids et de la composition corporelle.

EXIGENCE DE QUALITÉ DU REPAS :
Un repas composé d'une seule source de protéine nature sans aucun accompagnement n'est pas idéal pour le plaisir de manger. Quand c'est possible SANS compromettre le respect des macros cibles, ajoute 1 à 3 éléments d'accompagnement (légume, assaisonnement, petite portion de féculent ou de matière grasse) pour rendre le repas plus appétissant. Mais la PRIORITÉ ABSOLUE reste de respecter au plus près possible les macros restantes indiquées ci-dessus (tolérance ±15% sur chaque macro) — si ajouter un accompagnement t'éloigne trop de la cible, ajuste plutôt les quantités des ingrédients existants ou choisis un accompagnement qui n'apporte presque pas de kcal/macros (ex: épices, herbes, légumes très pauvres comme la salade verte ou le concombre).

MÉTHODE DE CALCUL OBLIGATOIRE — c'est l'étape la plus importante :
Pour chaque repas, tu dois d'abord choisir des ingrédients avec des QUANTITÉS PRÉCISES (en grammes ou unités), puis calculer les kcal et macros de CHAQUE ingrédient séparément à partir de valeurs nutritionnelles réelles et standards (ex: poulet cru/grillé ≈ 165 kcal et 31g protéines pour 100g ; riz cuit ≈ 130 kcal et 28g glucides pour 100g ; avocat ≈ 160 kcal, 2g protéines, 9g glucides, 15g lipides pour 100g ; huile d'olive ≈ 884 kcal et 100g lipides pour 100g, donc 1 cuillère à soupe/14g ≈ 124 kcal et 14g lipides ; épinards crus ≈ 23 kcal pour 100g, quasiment pas de macros significatives ; œuf entier ≈ 70 kcal et 6g protéines par unité).
Ensuite tu dois SOMMER ces valeurs par ingrédient pour obtenir kcal/proteines/glucides/lipides du repas complet — n'invente jamais directement un total sans être passé par cette somme. Vérifie deux choses avant de répondre : (1) que kcal ≈ proteines×4 + glucides×4 + lipides×9 (tolérance ±10%), et (2) que proteines/glucides/lipides du repas sont chacun à ±15% maximum des valeurs "IL RESTE EXACTEMENT" indiquées plus haut. Si l'un des deux échoue, ajuste les quantités des ingrédients et recalcule avant de répondre.
Dans le champ "ingredients", indique les quantités précises utilisées pour le calcul (ex: "150g de poulet grillé" plutôt que juste "poulet grillé"), pour que l'utilisateur puisse vérifier.

Réponds d'abord par ton raisonnement de calcul (quantités choisies, kcal/macros de chaque ingrédient, somme), puis termine OBLIGATOIREMENT par le JSON final sur une ligne commençant par "JSON_FINAL:" suivi du JSON valide sans markdown (n'utilise PAS les chiffres de l'exemple ci-dessous, ce sont juste des emplacements) :
JSON_FINAL:{"suggestions":[{"nom":"nom du repas","description":"description courte","kcal":0,"proteines":0,"glucides":0,"lipides":0,"ingredients":["150g de poulet grillé","100g de riz cuit"],"raison":"pourquoi ce repas est adapté"},{"nom":"nom du repas 2","description":"description courte","kcal":0,"proteines":0,"glucides":0,"lipides":0,"ingredients":["ingredient avec quantité"],"raison":"pourquoi ce repas est adapté"}]}`

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
    // Le modèle raisonne d'abord en texte libre (meilleure précision de calcul),
    // puis termine par "JSON_FINAL:{...}" — on extrait uniquement cette partie.
    const marker = 'JSON_FINAL:'
    const idx = text.lastIndexOf(marker)
    const jsonPart = idx >= 0 ? text.slice(idx + marker.length) : text
    const clean = jsonPart.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return Response.json(result)
  } catch(e) {
    console.log('Error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}