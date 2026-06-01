export default function MetricsBar({ poids, repas, seances, objectifs }) {
  const dernierPoids = poids?.[0]?.valeur || 0
  const objectifPoids = objectifs?.poids_objectif || 70
  const poidsDepart = objectifs?.poids_depart || 89.3
  const kcalObj = objectifs?.kcal_journalier || 1850
  const tmb = objectifs?.tmb || 1850

  const progression = poidsDepart > objectifPoids
    ? Math.round(((poidsDepart - dernierPoids) / (poidsDepart - objectifPoids)) * 100)
    : 0

  const today = new Date().toISOString().split('T')[0]
  const kcalAujourdhui = repas
    ?.filter(r => r.date === today)
    ?.reduce((sum, r) => sum + r.kcal, 0) || 0

  const kcalBruleesAujourdhui = seances
    ?.filter(s => s.date === today)
    ?.reduce((sum, s) => sum + (s.kcal || 0), 0) || 0

  const bilanCalorique = kcalAujourdhui - kcalBruleesAujourdhui - tmb

  const seancesSemaine = seances?.filter(s => {
    const date = new Date(s.date)
    const diff = (new Date() - date) / (1000 * 60 * 60 * 24)
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
        <div className="text-2xl font-medium">{Math.max(0, progression)}%</div>
        <div className="text-xs text-gray-400 mt-1">{(poidsDepart - dernierPoids).toFixed(1)} kg perdus</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Bilan calorique</div>
        <div className={`text-2xl font-medium ${bilanCalorique > 0 ? 'text-red-500' : 'text-green-600'}`}>
          {bilanCalorique > 0 ? '+' : ''}{bilanCalorique}
        </div>
        <div className="text-xs text-gray-400 mt-1">kcal · TMB {tmb} inclus</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-xs text-gray-400 mb-1">Séances cette semaine</div>
        <div className="text-2xl font-medium">{seancesSemaine}</div>
        <div className="text-xs text-gray-400 mt-1">/ 4 objectif</div>
      </div>
    </div>
  )
}