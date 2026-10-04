import { callAIJson } from '../../../lib/ai/server'
import { rejectUntrusted } from '../../../lib/security/requestGuard'

export async function POST(request) {
  const rejected = rejectUntrusted(request)
  if (rejected) return rejected
  const { repas = [], objectifs, tendances, budgetMoyen7j, macros } = await request.json()
  const trackedDays = new Set(repas.map(r => r?.date).filter(Boolean)).size

  const prompt = `Tu es l'analyste nutrition de Health Engine. Tu tutoies toujours l'utilisateur.

RÈGLES DE FIABILITÉ
- ${trackedDays} jour(s) nutritionnel(s) sont réellement suivis dans les données reçues.
- Une absence d'enregistrement n'est jamais 0 kcal consommée.
- Si moins de 3 jours sont suivis, tu expliques que la lecture est limitée et tu n'évalues pas l'adhérence comme un échec.
- Le budget est dynamique et varie selon TMB, pas et sport. Budget moyen de référence: ${budgetMoyen7j || 'indisponible'} kcal/jour.
- Ne recommande pas une autre application: les repas sont journalisés dans Health Engine.
- Pas de diagnostic médical, pas de dramatisation.

OBJECTIFS NUTRITIONNELS
- Protéines : ${macros?.proteines || objectifs?.proteines_objectif || 150} g/j
- Glucides : ${macros?.glucides || objectifs?.glucides_objectif || 200} g/j
- Lipides : ${macros?.lipides || objectifs?.lipides_objectif || 60} g/j
- TMB : ${objectifs?.tmb || 1875} kcal
- Déficit cible : ${objectifs?.deficit_cible || 750} kcal/j

DONNÉES CALCULÉES PAR HEALTH ENGINE
- Jours suivis 7j : ${tendances?.joursSuivis7j ?? trackedDays}
- Moyenne calories : ${trackedDays ? tendances?.moyKcal7j : 'indisponible'}
- Moyenne protéines : ${trackedDays ? tendances?.moyProt7j : 'indisponible'} g
- Moyenne glucides : ${trackedDays ? tendances?.moyGluc7j : 'indisponible'} g
- Moyenne lipides : ${trackedDays ? tendances?.moyLip7j : 'indisponible'} g
- Adhérence 7j : ${trackedDays ? tendances?.pctRespect7j : 'indisponible'}%
- Adhérence 30j : ${tendances?.joursSuivis30j ? tendances?.pctRespect30j : 'indisponible'}%

Réponds en JSON valide:
{
  "bilan": "mini-analyse de 3 à 5 phrases, sans confondre inconnu et zéro",
  "positifs": ["0 à 3 observations soutenues par les données"],
  "conseils": [
    {"titre": "titre court", "detail": "conseil concret dans Health Engine ou dans la routine"},
    {"titre": "titre court", "detail": "optionnel"}
  ],
  "confiance": "élevée|moyenne|limitée"
}`

  try {
    const { data } = await callAIJson({ messages: [{ role: 'user', content: prompt }], maxTokens: 1200 })
    return Response.json(data)
  } catch (e) {
    console.error('Nutrition AI error', e?.message)
    return Response.json({ error: e?.message || 'Erreur IA' }, { status: 500 })
  }
}
