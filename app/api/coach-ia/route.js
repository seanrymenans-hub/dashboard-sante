export async function POST(request) {
  const body = await request.json()
  const { poids = [], repas = [], seances = [], composition = [], objectifs, budget, tendances } = body

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7)
  const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth()+1).padStart(2,'0')}-${String(sevenDaysAgo.getDate()).padStart(2,'0')}`

  const poids7j = poids.filter(p => p.date >= sevenDaysAgoStr).sort((a,b) => b.date.localeCompare(a.date))
  const dernierPoids = poids7j[0]?.valeur ?? poids[0]?.valeur ?? null
  const ancienPoids = poids7j.length >= 2 ? poids7j[poids7j.length - 1]?.valeur : null
  const diffPoids = dernierPoids != null && ancienPoids != null ? Number((dernierPoids - ancienPoids).toFixed(1)) : null

  const repas7j = repas.filter(r => r.date >= sevenDaysAgoStr && r.date <= today)
  const nutritionDates = [...new Set(repas7j.map(r => r.date))]
  const seances7j = seances.filter(s => s.date >= sevenDaysAgoStr && s.date <= today)
  const totalMinSport = seances7j.reduce((sum, s) => sum + (Number(s.duree) || 0), 0)

  const compo7j = composition.filter(c => c.date >= sevenDaysAgoStr).sort((a,b) => b.date.localeCompare(a.date))
  const compoNow = compo7j[0] || null
  const compoOld = compo7j.length >= 2 ? compo7j[compo7j.length - 1] : null
  const diffGrasse = compoNow && compoOld ? Number(((compoNow.masse_grasse || 0) - (compoOld.masse_grasse || 0)).toFixed(1)) : null
  const diffMusculaire = compoNow && compoOld ? Number(((compoNow.masse_musculaire || 0) - (compoOld.masse_musculaire || 0)).toFixed(1)) : null

  const availability = {
    weight: poids7j.length >= 2 ? 'sufficient' : poids7j.length === 1 ? 'limited' : 'missing',
    nutrition: nutritionDates.length >= 4 ? 'sufficient' : nutritionDates.length > 0 ? 'limited' : 'missing',
    activity: seances7j.length > 0 ? 'available' : 'missing_or_none_logged',
    composition: compo7j.length >= 2 ? 'sufficient' : compo7j.length === 1 ? 'limited' : 'missing'
  }

  const prompt = `Tu es le coach éditorial de Health Engine, un dashboard personnel de santé. Tu écris en français, avec chaleur, précision et esprit critique. Le format peut être un mini-article : ne sois pas télégraphique, mais chaque phrase doit apporter quelque chose.

RÈGLES ABSOLUES :
- Une donnée absente n'est JAMAIS égale à zéro. "Aucun repas enregistré" signifie données nutritionnelles insuffisantes, pas que la personne n'a pas mangé.
- Une absence de séance enregistrée ne prouve ni sédentarité ni mauvaise semaine.
- N'invente aucune habitude, fréquence de repas, application externe ou action déjà gérée par Health Engine.
- Ne dramatise jamais une variation isolée de poids ou de composition. Mentionne l'incertitude (eau, glycogène, contenu digestif, mesure) quand pertinent.
- Ne recommande pas de modifier le budget calorique si les données sont insuffisantes pour le justifier.
- Les calculs fournis par Health Engine sont la source de vérité : interprète-les, ne les recalcule pas arbitrairement.
- Si une dimension est insuffisante, dis-le explicitement et explique quelles données permettraient une meilleure conclusion.
- Les conseils doivent être réalisables DANS ce dashboard : enregistrer les repas ici, synchroniser les données, suivre une tendance, etc.
- Ne fais pas de diagnostic médical.

DISPONIBILITÉ DES DONNÉES :
${JSON.stringify(availability, null, 2)}

DONNÉES :
- Poids actuel : ${dernierPoids ?? 'inconnu'} kg ; objectif : ${objectifs?.poids_objectif ?? 'inconnu'} kg
- Variation mesurable sur 7 jours : ${diffPoids == null ? 'insuffisamment de pesées' : `${diffPoids > 0 ? '+' : ''}${diffPoids} kg`}
- Jours avec nutrition enregistrée sur 7 jours : ${nutritionDates.length}/7
- Moyenne calories sur les jours suivis : ${nutritionDates.length ? `${tendances?.moyKcal7j || 0} kcal` : 'non calculable'}
- Moyenne protéines sur les jours suivis : ${nutritionDates.length ? `${tendances?.moyProt7j || 0} g` : 'non calculable'}
- Respect du budget sur jours suivis : ${nutritionDates.length ? `${tendances?.joursRespectés7j || 0}/${nutritionDates.length} (${tendances?.pctRespect7j || 0}%)` : 'non calculable'}
- Aujourd'hui : ${budget?.kcalConsommees || 0} kcal enregistrées ; budget ${budget?.budgetJour || '?'} kcal. Attention : 0 kcal peut simplement signifier qu'aucun repas n'a encore été loggé.
- Séances enregistrées sur 7 jours : ${seances7j.length} ; durée totale enregistrée : ${totalMinSport} min
- Composition : variation masse grasse ${diffGrasse == null ? 'non interprétable' : `${diffGrasse > 0 ? '+' : ''}${diffGrasse} kg`} ; masse musculaire ${diffMusculaire == null ? 'non interprétable' : `${diffMusculaire > 0 ? '+' : ''}${diffMusculaire} kg`}

Retourne UNIQUEMENT du JSON valide :
{
  "titre": "un titre éditorial spécifique à la situation",
  "bilan": "un mini-article de 4 à 6 phrases, nuancé et réellement fondé sur les données",
  "positifs": ["1 à 3 observations positives factuelles"],
  "attention": ["0 à 3 points qui méritent attention, y compris manque de données si pertinent"],
  "interpretation": "2 à 4 phrases qui croisent les signaux et expliquent ce qu'on peut ou ne peut pas conclure",
  "conseils": [
    {"titre":"action courte","detail":"action concrète et personnalisée"},
    {"titre":"action courte","detail":"action concrète et personnalisée"}
  ],
  "priorite": "une seule priorité n°1 pour les prochains jours",
  "confiance": "faible|moyenne|élevée",
  "confiance_detail": "raison brève liée à la quantité de données"
}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    })
    const raw = await response.text()
    const data = JSON.parse(raw)
    if (!response.ok) {
      console.error('OpenAI error:', response.status, JSON.stringify(data))
      return Response.json({ error: 'OpenAI ' + response.status, details: data }, { status: 500 })
    }
    const text = data.choices?.[0]?.message?.content || '{}'
    return Response.json(JSON.parse(text.replace(/```json|```/g, '').trim()))
  } catch (e) {
    console.error('Coach IA error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
