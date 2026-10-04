import { createClient } from '@supabase/supabase-js'
import { buildCoachContext } from '../../../lib/coachContext'
import { callAIJson, callAIText } from '../../../lib/ai/server'
import { rejectUntrusted } from '../../../lib/security/requestGuard'
import { dateKey } from '../../../lib/dateUtils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

function horizonLabel(horizon) {
  if (horizon === 'today') return "aujourd'hui"
  if (horizon === '30d') return 'les 30 derniers jours'
  return 'les 7 derniers jours'
}

function qualityLine(q) {
  const map = {
    good_data: 'données solides',
    partial_data: 'données partielles',
    insufficient_data: 'données insuffisantes',
    not_available: 'non disponible',
  }
  return `${q.label}: ${map[q.status] || q.status} (${q.detail})`
}

function makeSystemPrompt(ctx) {
  return `Tu es le Coach Intelligence de Health Engine, un tableau de bord personnel de suivi bien-être, nutrition, poids et activité.

RÈGLES NON NÉGOCIABLES
- Tu tutoies toujours l'utilisateur.
- Tu t'appuies uniquement sur les données fournies. Tu ne transformes jamais une absence d'enregistrement en un comportement réel.
- Une valeur nulle signifie "inconnue / non disponible", jamais zéro.
- Tu dis clairement quand la qualité des données limite une conclusion.
- Tu privilégies les tendances à plusieurs jours aux fluctuations isolées.
- Les mesures de composition Withings par impédancemétrie sont des estimations sensibles à l'hydratation: ne les présentes jamais comme des mesures cliniques exactes.
- Tu ne proposes pas de modifier fortement calories, déficit ou entraînement à partir d'un seul signal isolé.
- Tu distingues corrélation, hypothèse et cause certaine.
- Health Engine est déjà connecté à Withings pour le poids, la composition et les pas quand ces données sont synchronisées. Les repas se journalisent dans Nutrition et les séances dans Sport. Ne renvoie pas vers une autre app pour ces fonctions.
- Tu peux donner des conseils généraux de bien-être et fitness, mais tu ne poses pas de diagnostic médical.
- Tu restes analytique, humain et concret. Pas de dramatisation, pas de phrases culpabilisantes.

QUALITÉ DES DONNÉES
${Object.values(ctx.dataQuality).map(qualityLine).join('\n')}

CONTEXTE STRUCTURÉ HEALTH ENGINE
${JSON.stringify(ctx, null, 2)}

Quand tu réponds à une question, explique d'abord ce que montrent réellement les données, puis ce qu'on peut raisonnablement en déduire, puis l'action la plus utile. Si les données ne suffisent pas, dis-le franchement et précise ce qu'il faudrait suivre pour répondre avec plus de confiance.`
}

export async function POST(request) {
  const rejected = rejectUntrusted(request)
  if (rejected) return rejected
  try {
    const { messages = [], context = {}, generateSummary = false, horizon = '7d' } = await request.json()
    const ctx = buildCoachContext(context, horizon)
    const systemPrompt = makeSystemPrompt(ctx)
    const today = dateKey()

    if (generateSummary) {
      const prompt = `${systemPrompt}

MISSION
Produis une analyse approfondie de ${horizonLabel(horizon)}. Garde le format mini-article: suffisamment développé pour être utile, mais sans répéter trois fois les mêmes limites de données.

Ta réponse DOIT être un objet JSON valide avec exactement cette structure:
{
  "titre": "titre précis et naturel",
  "accroche": "une phrase qui résume le vrai signal principal",
  "bilan": "un paragraphe de 4 à 7 phrases, personnalisé, qui met les chiffres en perspective",
  "positifs": ["0 à 4 observations réellement soutenues par les données"],
  "attentions": ["0 à 4 observations à surveiller, sans confondre données manquantes et mauvais résultat"],
  "deduction": "ce que tu peux raisonnablement déduire en croisant poids, nutrition, activité et composition; indique les incertitudes utiles",
  "plan_action": [
    {"titre": "action 1", "detail": "action concrète dans Health Engine ou dans la routine"},
    {"titre": "action 2", "detail": "optionnel"}
  ],
  "priorite": "une seule priorité, courte et concrète",
  "confiance": "élevée | moyenne | limitée",
  "limites": "une courte phrase sur les limites de données, ou chaîne vide"
}

Contraintes supplémentaires:
- Maximum 3 actions.
- N'invente jamais un repas, une séance, des pas ou une mesure absente.
- Si nutrition/activité est insuffisamment suivie, formule cela comme une limite de lecture, pas comme un échec.
- Ne recommande pas une autre application.
- Si la tendance de poids est courte ou bruitée, ne l'assimile pas à une variation de graisse.
- Pour la composition corporelle, rappelle la prudence sur l'impédancemétrie seulement si cela est pertinent.`

      const { data: parsed } = await callAIJson({ messages: [{ role: 'user', content: prompt }], maxTokens: 2200 })
      const summary = {
        ...parsed,
        horizon,
        generated_at: new Date().toISOString(),
        data_quality: ctx.dataQuality,
      }

      const { data: existingRow } = await supabase.from('daily_summary').select('summary').eq('date', today).maybeSingle()
      let existing = existingRow?.summary
      if (typeof existing === 'string') { try { existing = JSON.parse(existing) } catch { existing = null } }
      const horizons = existing?.version === 2 && existing?.horizons ? { ...existing.horizons } : {}
      if (existing && existing?.version !== 2 && existing?.titre) horizons[existing.horizon || '7d'] = existing
      horizons[horizon] = summary
      const bundle = { version: 2, updated_at: new Date().toISOString(), horizons }
      await supabase.from('daily_summary').upsert({ date: today, summary: bundle }, { onConflict: 'date' })

      return Response.json({ summary, summaryBundle: bundle })
    }

    const safeMessages = messages.slice(-12)
    const text = await callAIText({ messages: [
      { role: 'system', content: systemPrompt },
      ...safeMessages
    ], maxTokens: 1400 })

    return Response.json({ message: text })
  } catch (e) {
    console.error('Coach global error:', e)
    return Response.json({ error: e.message || 'Erreur IA' }, { status: 500 })
  }
}
