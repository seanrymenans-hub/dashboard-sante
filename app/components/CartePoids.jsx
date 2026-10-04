import { computeHealthEngine } from '../../lib/healthEngine'

export default function CartePoids({ poids, repas, seances, objectifs, pas }) {
  const { progression: prog } = computeHealthEngine({ poids, repas, seances, composition: [], objectifs, pas })

  return (
    <section className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(124,92,255,0.3)]">
      <div className="text-[13px] font-bold text-[#a89a8f] tracking-wide">POIDS</div>
      <div className="flex items-baseline gap-2.5 mt-3">
        <span className="text-[32px] font-extrabold text-[#2a1a12]">{prog.poidsActuel}</span>
        <span className="text-sm text-[#b0a8a2]">kg</span>
        <span className="text-sm text-[#d8cfc8] mx-0.5">→</span>
        <span className="text-lg font-bold text-[#8a807a]">{prog.poidsObjectif} kg</span>
      </div>
      <div className="relative h-[3px] bg-[#f0ebe5] rounded-full mt-5">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#ff6b4a] transition-all"
          style={{ left: `${Math.max(1, Math.min(98, prog.progressionPct))}%` }}
        />
      </div>
      <div className="flex justify-between mt-3">
        <span className="text-sm font-extrabold text-[#2a1a12]">{prog.progressionPct}% atteint</span>
        <span className="text-sm text-[#8a807a]">{prog.kgPerdus.toFixed(1)} kg perdus</span>
      </div>
      <div className="text-xs text-[#8a807a] mt-2">
        {prog.kgRestants.toFixed(1)} kg restants · estimé le{' '}
        <b className="text-[#2a1a12]">
          {prog.dateEstimeeObjectif?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) || 'objectif atteint !'}
        </b>
      </div>
    </section>
  )
}
