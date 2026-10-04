import { callAIJson } from '../../../lib/ai/server'
import { rejectUntrusted } from '../../../lib/security/requestGuard'

export async function POST(request) {
  const rejected = rejectUntrusted(request)
  if (rejected) return rejected
  const { aliment } = await request.json()
  if (!String(aliment || '').trim()) return Response.json({ error: 'Description manquante' }, { status: 400 })

  const prompt = `Tu estimes un repas pour Health Engine.
Aliment/repas: "${String(aliment).slice(0, 1200)}"

RÈGLES
- Utilise des valeurs nutritionnelles réalistes (Ciqual/USDA comme repères), sans prétendre à une exactitude de laboratoire.
- Si la quantité est précisée, calcule pour cette quantité. Sinon choisis une portion standard réaliste et indique l'hypothèse.
- Tiens compte du mode de cuisson et décompose les plats composés.
- N'invente pas de précision excessive: arrondis de façon cohérente.

Réponds en JSON valide:
{
  "nom": "nom descriptif avec quantité/hypothèse",
  "kcal": 0,
  "proteines": 0,
  "glucides": 0,
  "lipides": 0,
  "note": "hypothèse de portion ou courte note de vérification"
}`
  try {
    const { data } = await callAIJson({ messages: [{ role: 'user', content: prompt }], maxTokens: 700 })
    return Response.json(data)
  } catch (e) {
    console.error('Food estimate AI error', e?.message)
    return Response.json({ error: e?.message || 'Estimation impossible' }, { status: 500 })
  }
}
