const EXERCICES_DB = {
  'Pompes':             { kcalPerRep: 0.32, groupes: ['Pectoraux', 'Triceps', 'Épaules'] },
  'Tractions':          { kcalPerRep: 0.50, groupes: ['Dos', 'Biceps'] },
  'Dips':               { kcalPerRep: 0.40, groupes: ['Triceps', 'Pectoraux', 'Épaules'] },
  'Squat':              { kcalPerRep: 0.32, groupes: ['Jambes', 'Fessiers'] },
  'Fentes':             { kcalPerRep: 0.35, groupes: ['Jambes', 'Fessiers'] },
  'Burpees':            { kcalPerRep: 0.80, groupes: ['Pectoraux', 'Jambes', 'Abdos'] },
  'Crunchs':            { kcalPerRep: 0.15, groupes: ['Abdos'] },
  'Mountain climbers':  { kcalPerRep: 0.15, groupes: ['Abdos', 'Épaules'] },
  'Jumping jacks':      { kcalPerRep: 0.20, groupes: ['Jambes'] },
  'Dips chaise':        { kcalPerRep: 0.30, groupes: ['Triceps', 'Épaules'] },
  'Hip thrust':         { kcalPerRep: 0.30, groupes: ['Fessiers', 'Jambes'] },
  'Relevés de jambes':  { kcalPerRep: 0.20, groupes: ['Abdos'] },
  'Superman':           { kcalPerRep: 0.15, groupes: ['Dos'] },
  'Pistol squat':       { kcalPerRep: 0.50, groupes: ['Jambes', 'Fessiers'] },
  'Gainage':              { kcalPerRep: 0.05, groupes: ['Abdos'] },
  'Gainage côté droit':   { kcalPerRep: 0.04, groupes: ['Abdos'] },
  'Gainage côté gauche':  { kcalPerRep: 0.04, groupes: ['Abdos'] },
  'Glute bridge':         { kcalPerRep: 0.28, groupes: ['Fessiers', 'Jambes'] },
}

export async function POST(request) {
  const { exercices, duree, poids } = await request.json()

  const poidsKg = poids || 82
  const facteurPoids = poidsKg / 80

  let kcalTotal = 0
  const groupesDetectes = new Set()
  const exercicesNonTrouves = []

  for (const ex of exercices.filter(e => e.nom)) {
    const db = EXERCICES_DB[ex.nom]
    if (db) {
      const reps = (Number(ex.series) || 1) * (Number(ex.reps) || 1)
      kcalTotal += Math.round(db.kcalPerRep * reps * facteurPoids * 10) / 10
      db.groupes.forEach(g => groupesDetectes.add(g))
    } else {
      exercicesNonTrouves.push(ex.nom)
    }
  }

  // Base métabolique pendant la séance
  const kcalBase = Math.round(poidsKg * 0.04 * duree)
  kcalTotal = Math.round(kcalTotal + kcalBase)

  // Zone d'entraînement basée sur les reps moyennes
  const repsMoyennes = exercices
    .filter(e => e.reps)
    .reduce((s, e) => s + Number(e.reps), 0) / Math.max(1, exercices.filter(e => e.reps).length)

  let zone = 'Endurance musculaire'
  if (repsMoyennes <= 6) zone = 'Force maximale'
  else if (repsMoyennes <= 12) zone = 'Hypertrophie'
  else if (repsMoyennes <= 20) zone = 'Endurance musculaire'
  else zone = 'Cardio / Résistance'

  const groupesArray = [...groupesDetectes]
  const explication = `${kcalTotal} kcal estimées dont ${kcalBase} kcal de base métabolique · Zone ${zone}`

  return Response.json({
    kcal: kcalTotal,
    zone,
    groupes: groupesArray,
    explication,
    exercicesNonTrouves
  })
}