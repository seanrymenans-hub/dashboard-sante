export default function MetricsBar({ poids, repas, seances }) {
  const dernierPoids = poids?.[0]?.valeur || 0
  const objectifPoids = 78
  const poidsDepart = 89.3
  const progression = Math.round(((poidsDepart - dernierPoids) / (poidsDepart - objectifPoids)) * 100)

  const kcalAujourdhui = repas
    ?.filter(r => r.date === new Date().toISOString().split('T')[0])
    ?.reduce((sum, r) => sum + r.kcal, 0) || 0

  const seancesSemaine = seances?.filter(s => {
    const date = new Date(s.date)
    const today = new Date()
    const diff = (today - date) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length || 0

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Poids actuel</div>
        <div className="text-2xl font-medium">{dernierPoids} kg</div>
        <div className="text-xs text-green-600 mt-1">objectif {objectifPoids} kg</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Progression</div>
        <div className="text-2xl font-medium">{progression}%</div>
        <div className="text-xs text-gray-400 mt-1">{(poidsDepart - dernierPoids).toFixed(1)} kg perdus</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Calories aujourd'hui</div>
        <div className="text-2xl font-medium">{kcalAujourdhui}</div>
        <div className="text-xs text-gray-400 mt-1">/ 2 000 kcal</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Séances cette semaine</div>
        <div className="text-2xl font-medium">{seancesSemaine}</div>
        <div className="text-xs text-gray-400 mt-1">/ 4 objectif</div>
      </div>
    </div>
  )
}