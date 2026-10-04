import { callAIJson } from '../../../lib/ai/server'
import { rejectUntrusted } from '../../../lib/security/requestGuard'
export async function POST(request) {
  const rejected = rejectUntrusted(request)
  if (rejected) return rejected
  try {
    const { seances = [], repas = [], poids = [], objectifs } = await request.json()
    const today = new Date().toISOString().split('T')[0]
    const repasAuj = repas.filter(r => r.date === today)
    const nutritionDisponible = repasAuj.length > 0
    const kcalAujourdhui = nutritionDisponible ? repasAuj.reduce((s,r) => s + (r.kcal || 0), 0) : null
    const kcalBrulees = seances.filter(s => s.date === today).reduce((s,r) => s + (r.kcal || 0),0)
    const dernierPoids = poids?.[0]?.valeur || 'inconnu'
    const objectifPoids = objectifs?.poids_objectif || 70
    const sorted = [...seances].sort((a,b) => b.date.localeCompare(a.date))
    const last = sorted[0]
    const joursDepuisDerniereSeance = last ? Math.max(0, Math.floor((Date.now() - new Date(`${last.date}T12:00:00`).getTime()) / 86400000)) : null
    const recent7 = sorted.filter(s => (Date.now() - new Date(`${s.date}T12:00:00`).getTime()) / 86400000 < 7)
    const recent21 = sorted.filter(s => (Date.now() - new Date(`${s.date}T12:00:00`).getTime()) / 86400000 < 21)
    const courses21 = recent21.filter(s => s.type === 'course')
    const moyDistanceCourse = courses21.length ? Math.round(courses21.reduce((s,r)=>s+(Number(r.distance)||0),0)/courses21.length*10)/10 : null
    const moyDureeCourse = courses21.length ? Math.round(courses21.reduce((s,r)=>s+(Number(r.duree)||0),0)/courses21.length) : null
    const nbCourse7 = recent7.filter(s=>s.type==='course').length
    const nbRenfo7 = recent7.filter(s=>s.type==='renforcement').length
    const totalMin7 = recent7.reduce((s,r)=>s+(Number(r.duree)||0),0)
    const detail = sorted.slice(0,10).map(s => `${s.date} - ${s.type} - ${s.nom} - ${s.duree}min${s.distance ? ` - ${s.distance}km` : ''}${s.notes ? ` - ${s.notes}` : ''}`).join('\n')

    const prompt = `Tu es le coach sportif de Health Engine. Tu tutoies l'utilisateur et tu proposes sa "next best workout" à partir des données réellement disponibles.

RÈGLES :
- Zéro enregistré n'est pas forcément zéro réel. Si aucun repas n'est enregistré aujourd'hui, la nutrition est INCONNUE : ne dis pas qu'il a mangé 0 kcal.
- Une absence de séance enregistrée n'est pas une preuve d'inactivité totale.
- N'invente pas de fatigue, blessure ou surentraînement.
- Si deux courses ou plus sont déjà enregistrées cette semaine et aucun renforcement, privilégie généralement un renforcement au poids du corps, sauf raison claire contraire.
- Si tu proposes une course, reste proche du volume récent et donne une allure cible seulement si l'historique permet de la justifier.
- Si tu proposes du renforcement : uniquement poids du corps, exercices concrets, séries/reps et repos.
- La réponse doit expliquer en 4-6 phrases pourquoi cette séance est la meilleure prochaine action, sans discours générique.

CONTEXTE :
- Poids actuel : ${dernierPoids} kg ; objectif : ${objectifPoids} kg
- Dernière séance : ${last ? `${last.date} · ${last.type} · ${last.nom}` : 'inconnue'}
- Jours depuis dernière séance : ${joursDepuisDerniereSeance ?? 'inconnu'}
- Cette semaine : ${recent7.length} séance(s), ${totalMin7} min, ${nbCourse7} course(s), ${nbRenfo7} renforcement
- Course sur 21j : ${courses21.length} sortie(s), distance moyenne ${moyDistanceCourse ?? 'inconnue'} km, durée moyenne ${moyDureeCourse ?? 'inconnue'} min
- Nutrition aujourd'hui : ${nutritionDisponible ? `${kcalAujourdhui} kcal enregistrées` : 'non suivie / inconnue'}
- Sport aujourd'hui : ${kcalBrulees} kcal enregistrées

HISTORIQUE :
${detail || 'Aucune séance récente enregistrée'}

Réponds UNIQUEMENT en JSON valide :
{"type":"course ou renforcement","titre":"nom précis","duree":35,"distance":null,"allure":null,"intensite":"légère ou modérée ou intense","groupesCibles":[],"raison":"explication personnalisée","exercices":[{"nom":"exercice ou étape","series":"3 x 10","repos":"60 sec"}]}`

    const { data } = await callAIJson({ messages: [{ role: 'user', content: prompt }], maxTokens: 1200 })
    return Response.json({ suggestion: data })
  } catch(e) {
    console.error('Erreur suggestion-seance:', e)
    return Response.json({error:e.message},{status:500})
  }
}
