import { createClient } from '@supabase/supabase-js'

// Initialisation du client Supabase avec la clé service_role pour l'écriture système
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function POST(request) {
  try {
    const { poids, seances, repas, composition, objectifs } = await request.json()
    console.log('Données reçues:', JSON.stringify({
      poidsActuel: poids?.[0]?.valeur,
      nbRepas: repas?.length,
      nbSeances: seances?.length,
      tmb: objectifs?.tmb,
      kcalObj: objectifs?.kcal_journalier,
    }))

    const poidsActuel = poids?.[0]?.valeur || 82
    const objectifPoids = objectifs?.poids_objectif || 70
    const tmb = objectifs?.tmb || 1875
    
    // Utilisation de dates standardisées "à minuit" pour éviter les bugs d'heures
    const maintenant = new Date()
    const aujourdhuiMinuit = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
    const todayStr = aujourdhuiMinuit.toISOString().split('T')[0]

    // Récupération du lundi de la semaine en cours pour indexer dans Supabase
    const now = new Date()
    const lundi = new Date(now)
    lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const semaineStr = lundi.toISOString().split('T')[0]

    // 1. Calories brûlées aujourd'hui (Sport)
    const kcalBruléesAujourdhui = seances
      ? seances.filter(s => s.date === todayStr).reduce((s, r) => s + (r.kcal || 0), 0)
      : 0

    // Moyenne calories brûlées 7 derniers jours (comparaison propre de date à date)
    const seances7j = seances 
      ? seances.filter(s => {
          const dateSeance = new Date(s.date)
          const diffTemps = aujourdhuiMinuit - new Date(dateSeance.getFullYear(), dateSeance.getMonth(), dateSeance.getDate())
          const diffJours = diffTemps / (1000 * 60 * 60 * 24)
          return diffJours >= 0 && diffJours <= 7
        })
      : []
      
    const kcalSportMoyenne = seances7j.length > 0
      ? Math.round(seances7j.reduce((s, r) => s + (r.kcal || 0), 0) / 7)
      : 0

    // 2. CE QUE TU AS DÉJÀ MANGÉ AUJOURD'HUI (Sécurisé avec ??)
    const repasAujourdhui = repas ? repas.filter(r => r.date === todayStr) : []
    const dejaConsomme = {
      kcal: repasAujourdhui.reduce((s, r) => s + (r.kcal ?? 0), 0),
      proteines: repasAujourdhui.reduce((s, r) => s + (r.proteines ?? r.macros?.proteines ?? 0), 0),
      glucides: repasAujourdhui.reduce((s, r) => s + (r.glucides ?? r.macros?.glucides ?? 0), 0),
      lipides: repasAujourdhui.reduce((s, r) => s + (r.lipides ?? r.macros?.lipides ?? 0), 0),
    }
    console.log('Debug repas:', { todayStr, nbRepasTotal: repas?.length, nbRepasAujourdhui: repasAujourdhui.length, kcalTotal: dejaConsomme.kcal, premierRepasDate: repas?.[0]?.date })

    // Composition corporelle
    const derniereCompo = composition?.[0]
    const masseMusculaire = derniereCompo?.masse_musculaire || 60

    // 🌟 LE PROMPT ENTIÈREMENT NETTOYÉ DES SOUCIS DE SYNTAXE
    const prompt = `Tu es un moteur de calcul nutritionnel déterministe et factuel, optimisé pour la perte de masse grasse maximale et la préservation de la masse musculaire.

⚠️ DIRECTIVE STRICTE : Pas de phrases d'introduction, pas de politesses, pas de conseils généraux. Analyse les données et applique les formules mathématiques suivantes.

---

PROFIL UTILISATEUR
- Poids actuel : ${poidsActuel} kg
- Objectif cible : ${objectifPoids} kg
- TMB (Métabolisme de base) : ${tmb} kcal
- Masse musculaire : ${masseMusculaire} kg

---

SITUATION DU JOUR
- Calories brûlées via le sport aujourd'hui : ${kcalBruléesAujourdhui} kcal
- Moyenne sport (7j) : ${kcalSportMoyenne} kcal
- Déjà consommé aujourd'hui :
  - Calories : ${dejaConsomme.kcal} kcal
  - Protéines : ${dejaConsomme.proteines} g
  - Glucides : ${dejaConsomme.glucides} g
  - Lipides : ${dejaConsomme.lipides} g

---

RÈGLES DE CALCUL ET LOGIQUE (À SUIVRE DANS L'ORDRE)

1. BESOIN_ENERGETIQUE_TOTAL = TMB + Calories brûlées via le sport aujourd'hui.

2. CIBLE_CALORIES_JOUR = BESOIN_ENERGETIQUE_TOTAL - 750.
   (Note : Pas de limite basse à 1200 kcal. La cible est purement mathématique selon la formule ci-dessus).

3. PROTÉINES_JOUR (Fixe) = Math.round(2 * masse_musculaire).
   (Les protéines restent prioritaires pour protéger le muscle, soit ${Math.round(masseMusculaire * 2)}g).

4. RÉPARTITION DES CALORIES RESTANTES (CIBLE_CALORIES_JOUR - (PROTÉINES_JOUR * 4)) :
   - SI sport aujourd'hui > 200 kcal (Journée active) :
     - Lipides = 25% des calories restantes / 9
     - Glucides = 75% des calories restantes / 4 (Priorité à la recharge de glycogène)
   - SI sport aujourd'hui <= 200 kcal (Journée sédentaire) :
     - Lipides = 40% des calories restantes / 9
     - Glucides = 60% des calories restantes / 4 (Stratégie Low-Carb pour vider les stocks)

5. ANALYSE DU DÉPASSEMENT :
   - Compare "Déjà consommé : Calories" avec "CIBLE_CALORIES_JOUR".
   - SI Déjà consommé > CIBLE_CALORIES_JOUR :
     - Positionne le message pour indiquer factuellement le montant du dépassement.
     - Dans "ajustement", calcule une stratégie précise pour le lendemain (ex: augmenter le déficit du lendemain de X kcal ou planifier une séance de sport de X min pour compenser).

6. VALEURS DU JSON :
   Les clés "kcal", "proteines", "glucides", "lipides" doivent refléter la CIBLE GLOBALE AJUSTÉE pour toute la journée.
   - Si tu constates un dépassement aujourd'hui, la cible "kcal" doit rester la cible idéale de base de la journée (pour que le tableau de bord affiche visuellement le dépassement dans la jauge).
   - Par contre, utilise le champ "message" pour dire : "Tu as consommé 921 kcal sur une cible idéale de X kcal." et utilise le champ "ajustement" pour donner les calculs précis.

---

FORMAT DE SORTIE JSON STRICT :
{
  "kcal": 0,
  "proteines": 0,
  "glucides": 0,
  "lipides": 0,
  "deficit": 750,
  "message": "Explication détaillée du calcul : TMB + sport - déficit = objectif calorique, avec justification de chaque macro",
  "ajustement": "Plan d'action précis pour optimiser la perte de poids"
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
          temperature: 0,
        }),
      }
    )

    const rawText = await response.text()
    if (!response.ok) {
      throw new Error(`Erreur GitHub API (${response.status}): ${rawText}`)
    }

    const data = JSON.parse(rawText)
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text
     .replaceAll('```json', '')
     .replaceAll('```', '')
     .trim()
    const result = JSON.parse(clean)

    // 🌟 SAUVEGARDE EN BASE DE DONNÉES DANS MACROS_IA
    const { error: upsertError } = await supabase
      .from('macros_ia')
      .upsert({ 
        semaine: semaineStr, 
        kcal: result.kcal,
        proteines: result.proteines,
        glucides: result.glucides,
        lipides: result.lipides,
        deficit: result.deficit,
        message: result.message,
        ajustement: result.ajustement,
        updated_at: new Date().toISOString()
      }, { onConflict: 'semaine' })

    if (upsertError) {
      console.error("Erreur de sauvegarde Supabase:", upsertError)
    }

    return Response.json(result)

  } catch (e) {
    console.error('macros-ia error:', e.message, e.stack)
    return Response.json({ error: e.message }, { status: 500 })
  }
}