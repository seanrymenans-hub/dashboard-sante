import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function POST(request) {
  const { messages, context, generateSummary } = await request.json()

  const { poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances } = context

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const dernierPoids = poids?.[0]?.valeur || '?'
  const pasAujourdhui = pas?.find(p => p.date === today)
  const hydAujourdhui = hydratation?.find(h => h.date === today)
  const kcalAujourdhui = repas?.filter(r => r.date === today).reduce((s, r) => s + r.kcal, 0) || 0
  const seancesAujourdhui = seances?.filter(s => s.date === today) || []
  const seancesSemaine = seances?.filter(s => {
    const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }) || []

  const systemPrompt = `Tu es un coach santé personnel expert et bienveillant. Tu as accès à TOUTES les données réelles de ton athlète. Tu réponds TOUJOURS en te basant sur ses données réelles, jamais de façon générique.

PROFIL COMPLET :
- Poids actuel : ${dernierPoids} kg → objectif ${objectifs?.poids_objectif || 70} kg
- Départ : ${objectifs?.poids_depart || '?'} kg
- Kg perdus : ${progression?.kgPerdus?.toFixed(1) || '?'} kg
- Kg restants : ${progression?.kgRestants?.toFixed(1) || '?'} kg
- Progression : ${progression?.progressionPct || 0}%
- Date estimée objectif : ${progression?.dateEstimeeObjectif ? new Date(progression.dateEstimeeObjectif).toLocaleDateString('fr-FR') : '?'}
- TMB : ${objectifs?.tmb || 1875} kcal
- Déficit cible : ${objectifs?.deficit_cible || 750} kcal

AUJOURD'HUI (${today}) :
- Calories consommées : ${kcalAujourdhui} kcal / ${budget?.budgetJour || '?'} kcal budget
- Pas : ${pasAujourdhui?.nb_pas?.toLocaleString('fr-FR') || 0} pas (${pasAujourdhui?.calories_pas || 0} kcal)
- Distance marche : ${Math.round((pasAujourdhui?.distance_m || 0) / 100) / 10} km
- Sport aujourd'hui : ${seancesAujourdhui.map(s => s.nom).join(', ') || 'aucun'}
- Hydratation : ${hydAujourdhui ? (hydAujourdhui.verres / 1000).toFixed(1) + 'L' : '0L'}

TENDANCES 7 JOURS :
- Moyenne calories : ${tendances?.moyKcal7j || 0} kcal/jour
- Moyenne protéines : ${tendances?.moyProt7j || 0}g/jour
- Respect objectifs : ${tendances?.pctRespect7j || 0}%
- Séances cette semaine : ${seancesSemaine.length}

COMPOSITION CORPORELLE (dernière mesure) :
- Masse grasse : ${composition?.[0]?.masse_grasse || '?'} kg (${composition?.[0]?.masse_grasse_pct || '?'}%)
- Masse musculaire : ${composition?.[0]?.masse_musculaire || '?'} kg
- Masse hydrique : ${composition?.[0]?.masse_hydrique || '?'} kg

OBJECTIFS NUTRITIONNELS (configurés par l'utilisateur, peuvent changer) :
- Protéines : ${objectifs?.proteines_objectif || 150}g
- Glucides : ${objectifs?.glucides_objectif || 200}g
- Lipides : ${objectifs?.lipides_objectif || 60}g
- Budget calorique aujourd'hui : ${budget?.budgetJour || '?'} kcal (dynamique selon pas + sport)

Tu es concis, direct et personnalisé. Tu utilises les vraies données dans chaque réponse.`

  if (generateSummary) {
    const summaryPrompt = `${systemPrompt}

Génère une synthèse quotidienne personnalisée pour aujourd'hui. Inclus :
1. Un bilan de la journée en cours
2. Les points positifs
3. Les points d'attention
4. 2-3 objectifs clairs pour aujourd'hui/demain

Réponds en JSON :
{
  "titre": "titre accrocheur",
  "bilan": "bilan long et détaillé, minimum 5-6 phrases, s'appuie sur toutes les données réelles",
  "positifs": ["autant de points que nécessaire"],
  "attentions": ["autant de points que nécessaire"],
  "objectifs": ["autant d'objectifs concrets que nécessaire"]
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
          messages: [{ role: 'user', content: summaryPrompt }],
          temperature: 0.5
        })
      })
      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const summary = JSON.parse(clean)

      await supabase.from('daily_summary').upsert(
        { date: today, summary },
        { onConflict: 'date' }
      )

      return Response.json({ summary })
    } catch(e) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  // Chat normal
  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7
      })
    })
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    return Response.json({ message: text })
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}