import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)
export async function POST(request) {
  const { objectifs, poids, composition, semaine, jours, macros } = await request.json()
  console.log('Jours reçus par API:', jours.map(j => j.nom))
  const preferences = objectifs?.preferences_alimentaires || ''

  const kcalObj = objectifs?.kcal_journalier || 1850
  const protObj = macros?.proteines || 166
  const carbObj = macros?.glucides || 91
  const lipObj = macros?.lipides || 38
  const masseMusculaire = composition?.masse_musculaire || 60

  const joursStr = jours.map((j, idx) => {
    const repasActifs = Object.entries(j.repas).map(([id, r]) => {
      const estDiner = id === 'diner'
      const jourSuivant = jours[idx + 1]?.nom || null
      return `  - ${r.label} : ${r.portionsBase} portion(s)${estDiner && r.restes ? ` — PRÉPARER x2 (restes pour le déjeuner de ${jourSuivant || 'demain'})` : ''}`
    }).join('\n')
    return `${j.nom} :\n${repasActifs}`
  }).join('\n\n')

  const prompt = `Tu es un nutritionniste expert et chef cuisinier. Compose un plan de repas pour la semaine en te basant sur les données réelles de cet utilisateur.

PROFIL UTILISATEUR :
- Poids actuel : ${poids} kg
- Objectif calorique : ${kcalObj} kcal/jour
- Protéines : ${protObj}g/jour
- Glucides : ${carbObj}g/jour  
- Lipides : ${lipObj}g/jour
- Masse musculaire : ${masseMusculaire} kg (protéines importantes pour préserver le muscle)
- Objectif : perte de poids rapide

LISTE D'ALIMENTS AUTORISÉS (utilise UNIQUEMENT ces aliments, rien d'autre) :
${preferences}

JOURS À PLANIFIER (UNIQUEMENT ces jours, pas d'autres) :
${joursStr}

IMPORTANT : Tu dois générer EXACTEMENT ${jours.length} jour(s) dans le tableau "jours". Pas plus, pas moins. Si tu reçois 3 jours, tu génères 3 jours.

RÈGLES IMPORTANTES :
- Compose des vrais repas équilibrés et savoureux — pas de liste générique
- Respecte les objectifs nutritionnels par jour
- Si "restes" est indiqué, prévois explicitement +1 portion supplémentaire et note-le
- Adapte les quantités d'ingrédients au nombre de portions
- Varie les sources de protéines (poulet, œufs, légumineuses, poisson si apprécié)
- Favorise les légumes et les aliments rassasiants
- Les repas doivent être réalistes et faciles à préparer
- Si un dîner a "PRÉPARER x2", le déjeuner du jour suivant DOIT être exactement le même repas avec la mention "Restes du dîner de [jour précédent]" dans restesNote
- Pour les repas x2, la liste de courses doit prévoir le double des ingrédients
- Pour chaque jour, calcule le total de protéines. Si le total est inférieur à ${protObj}g, ajoute un champ "suggestionProteines" avec une suggestion concrète d'aliment à ajouter (ex: "Ajoute 2 œufs durs en snack (+12g protéines)" ou "Ajoute 30g de fromage blanc (+5g protéines)")

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "jours": [
    {
      "nom": "Lundi",
      "petitDejeuner": {
        "nom": "Nom du repas",
        "kcal": 400,
        "proteines": 25,
        "glucides": 45,
        "lipides": 12,
        "ingredients": ["200g flocons d'avoine", "1 banane", "15g amandes"],
        "restesNote": null
      },
      "dejeuner": {
        "nom": "Nom du repas",
        "kcal": 550,
        "proteines": 45,
        "glucides": 55,
        "lipides": 15,
        "ingredients": ["150g poulet grillé", "80g riz cuit", "200g légumes vapeur"],
        "restesNote": null
      },
      "diner": {
        "nom": "Nom du repas",
        "kcal": 480,
        "proteines": 38,
        "glucides": 40,
        "lipides": 14,
        "ingredients": ["200g saumon", "150g quinoa", "salade verte"],
        "restesNote": "Prépare 2 portions — les restes serviront pour le déjeuner de demain"
      },
      "suggestionProteines": "Ajoute 2 œufs durs en snack (+12g protéines) pour atteindre ton objectif de 150g"
    }
  ],
  "listeCourses": {
    "Protéines": ["poulet 600g", "oeufs x12", "saumon 400g"],
    "Féculents": ["flocons d'avoine 500g", "riz 500g", "quinoa 300g"],
    "Légumes": ["brocoli 500g", "courgettes 3", "salade 1"],
    "Fruits": ["bananes x5", "pommes x4"],
    "Produits laitiers": ["yaourt grec x6"],
    "Autres": ["amandes 100g", "huile d'olive", "épices variées"]
  }
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
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    })
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    const { error: upsertError } = await supabase.from('meal_plans').upsert(
      { semaine, plan: result.jours, liste_courses: result.listeCourses },
      { onConflict: 'semaine' }
    )
    if (upsertError) console.error('Upsert error:', upsertError)
    return Response.json(result)
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}