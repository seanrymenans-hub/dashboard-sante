export default function MiniStats({ seances, pas, objectifs }) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const pasAujourdhui = pas?.find(p => p.date === today)
  const nbPas = pasAujourdhui?.nb_pas || 0
  const objectifPas = objectifs?.objectif_pas || 10000
  const objectifSeances = objectifs?.objectif_seances_semaine || 4

  const seancesSemaine = seances?.filter(s => {
    const diff = (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length || 0

  const pctPas = Math.min(100, Math.round((nbPas / objectifPas) * 100))
  const pctSeances = Math.min(100, Math.round((seancesSemaine / objectifSeances) * 100))

  return (
    <section className="grid grid-cols-2 gap-3">

      <div className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.18)]">
        <div
          className="w-12 h-12 rounded-full flex-none flex items-center justify-center"
          style={{ background: `conic-gradient(#7c5cff 0% ${pctSeances}%, #efeaff ${pctSeances}% 100%)` }}
        >
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-sm">🏋️</div>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-[#2a1a12] leading-none">
            {seancesSemaine}<span className="text-sm font-medium text-[#b0a8a2]">/{objectifSeances}</span>
          </div>
          <div className="text-[11px] text-[#8a807a] mt-1.5 leading-tight">séances cette semaine</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.18)]">
        <div
          className="w-12 h-12 rounded-full flex-none flex items-center justify-center"
          style={{ background: `conic-gradient(#16c79a 0% ${pctPas}%, #d4f5ec ${pctPas}% 100%)` }}
        >
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-sm">👟</div>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-[#2a1a12] leading-none">{nbPas.toLocaleString('fr-FR')}</div>
          <div className="text-[11px] text-[#8a807a] mt-1.5 leading-tight">/ {objectifPas.toLocaleString('fr-FR')} pas</div>
        </div>
      </div>

    </section>
  )
}
