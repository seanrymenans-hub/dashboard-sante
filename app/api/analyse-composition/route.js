import { callAIJson } from '../../../lib/ai/server'
import { rejectUntrusted } from '../../../lib/security/requestGuard'
function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function nearestBefore(rows, latestDate, days, tolerance = 12) {
  if (!rows?.length || !latestDate) return null
  const target = new Date(latestDate)
  target.setDate(target.getDate() - days)
  const candidates = rows.filter(r => new Date(r.date) < new Date(latestDate))
  if (!candidates.length) return null
  const nearest = candidates.reduce((best, row) => Math.abs(new Date(row.date) - target) < Math.abs(new Date(best.date) - target) ? row : best, candidates[0])
  const gap = Math.abs((new Date(nearest.date) - target) / 86400000)
  return gap <= tolerance ? nearest : null
}

function delta(a, b) {
  const av = num(a); const bv = num(b)
  return av === null || bv === null ? null : Math.round((av - bv) * 10) / 10
}

export async function POST(request) {
  const rejected = rejectUntrusted(request)
  if (rejected) return rejected
  const { composition = [], poids = [] } = await request.json()
  const sorted = [...composition].sort((a, b) => new Date(b.date) - new Date(a.date))
  const derniere = sorted[0]

  if (!derniere) return Response.json({ error: 'Aucune mesure de composition disponible.' }, { status: 400 })

  const m7 = nearestBefore(sorted, derniere.date, 7, 4)
  const m30 = nearestBefore(sorted, derniere.date, 30, 12)
  const disponibilite = {
    composition: sorted.length >= 3 ? 'suffisante' : sorted.length >= 1 ? 'limitée' : 'absente',
    tendance7j: Boolean(m7),
    tendance30j: Boolean(m30),
    poids: poids.length >= 2 ? 'suffisant' : poids.length === 1 ? 'limité' : 'absent',
  }

  const tendances = {
    grasse7j: m7 ? delta(derniere.masse_grasse, m7.masse_grasse) : null,
    muscle7j: m7 ? delta(derniere.masse_musculaire, m7.masse_musculaire) : null,
    grasse30j: m30 ? delta(derniere.masse_grasse, m30.masse_grasse) : null,
    muscle30j: m30 ? delta(derniere.masse_musculaire, m30.masse_musculaire) : null,
  }

  const prompt = `Tu es le coach analytique de Health Engine. Tu tutoies toujours l'utilisateur. Tu analyses des mesures de composition corporelle issues principalement d'une balance Withings à impédancemétrie.

RÈGLES IMPORTANTES :
- Une balance à impédancemétrie varie avec l'hydratation, l'heure, les repas et le glycogène. N'interprète jamais une variation isolée de masse musculaire ou grasse comme un changement physiologique certain.
- Priorise les tendances répétées et les fenêtres 30 jours. Une tendance 7 jours est un signal récent, pas une preuve.
- Ne transforme jamais une donnée absente en zéro.
- Si les données sont insuffisantes, dis-le une fois clairement puis exploite ce qui est réellement disponible sans te répéter.
- Ne diagnostique aucune maladie et ne donne pas de conclusion médicale.
- Health Engine est connecté à Withings : ne conseille pas de saisir manuellement les mesures si la synchronisation est disponible.
- Ton ton est premium, analytique, naturel et concret. Pas de dramatisation.

DERNIÈRE MESURE (${derniere.date}) :
- Masse grasse : ${derniere.masse_grasse ?? 'N/A'} kg (${derniere.masse_grasse_pct ?? 'N/A'}%)
- Masse musculaire : ${derniere.masse_musculaire ?? 'N/A'} kg (${derniere.masse_musculaire_pct ?? 'N/A'}%)
- Masse hydrique : ${derniere.masse_hydrique ?? 'N/A'} kg (${derniere.masse_hydrique_pct ?? 'N/A'}%)
- Masse maigre : ${derniere.masse_maigre ?? 'N/A'} kg
- Masse osseuse : ${derniere.masse_osseuse ?? 'N/A'} kg

TENDANCES CALCULÉES PAR HEALTH ENGINE :
- Masse grasse 7j : ${tendances.grasse7j ?? 'indisponible'} kg
- Masse musculaire 7j : ${tendances.muscle7j ?? 'indisponible'} kg
- Masse grasse 30j : ${tendances.grasse30j ?? 'indisponible'} kg
- Masse musculaire 30j : ${tendances.muscle30j ?? 'indisponible'} kg
- Disponibilité des données : ${JSON.stringify(disponibilite)}

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "titre": "un titre bref qui résume le signal principal",
  "analyse": "un mini-article de 4 à 6 phrases, nuancé, qui explique ce que racontent réellement les données",
  "points": [
    {"texte": "signal utile ou observation factuelle", "positif": true},
    {"texte": "signal utile ou observation factuelle", "positif": true},
    {"texte": "point à garder à l'œil, sans dramatiser", "positif": false}
  ],
  "priorite": "une seule action concrète dans Health Engine ou dans la routine de mesure, seulement si elle est justifiée",
  "confiance": "faible|moyenne|bonne"
}`

  try {
    const { data } = await callAIJson({ messages: [{ role: 'user', content: prompt }], maxTokens: 1400 })
    return Response.json(data)
  } catch(e) {
    console.error('Composition AI error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
