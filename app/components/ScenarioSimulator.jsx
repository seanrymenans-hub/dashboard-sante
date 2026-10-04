'use client'
import { useMemo, useState } from 'react'

export default function ScenarioSimulator({ budget, pas, today }) {
  const [calDelta, setCalDelta] = useState(0)
  const [stepsDelta, setStepsDelta] = useState(0)
  const todaySteps = pas?.find(p => p.date === today)?.nb_pas
  const result = useMemo(() => {
    const activityDelta = stepsDelta * 0.04
    const dailyNet = calDelta - activityDelta
    const kgEquivalent = dailyNet * 56 / 7700
    const low = kgEquivalent * 0.65
    const high = kgEquivalent * 1.35
    return { activityDelta: Math.round(activityDelta), dailyNet: Math.round(dailyNet), low: Math.min(low, high), high: Math.max(low, high) }
  }, [calDelta, stepsDelta])

  const formatKg = v => `${v > 0 ? '+' : ''}${v.toFixed(1)} kg`
  return (
    <section className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] p-7">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div><div className="text-[18px] font-extrabold text-[#2a1a12]">Et si… ?</div><div className="text-[13px] text-[#8a807a] mt-1">Simule un petit changement sans IA. C’est une approximation énergétique, pas une prédiction de poids.</div></div>
        <span className="text-[10px] font-bold uppercase tracking-[.08em] text-[#b0a8a2]">0 token</span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="rounded-2xl bg-[#f9f6f3] p-4"><div className="flex justify-between text-xs font-bold text-[#6d625c]"><span>Calories / jour</span><span>{calDelta > 0 ? '+' : ''}{calDelta} kcal</span></div><input type="range" min="-300" max="300" step="50" value={calDelta} onChange={e=>setCalDelta(Number(e.target.value))} className="w-full mt-4 accent-[#ff6b4a]"/><div className="text-[10px] text-[#aaa09a] mt-2">Par rapport à ton budget actuel ({budget?.budgetJour || '—'} kcal)</div></label>
        <label className="rounded-2xl bg-[#f9f6f3] p-4"><div className="flex justify-between text-xs font-bold text-[#6d625c]"><span>Pas / jour</span><span>{stepsDelta > 0 ? '+' : ''}{stepsDelta.toLocaleString('fr-FR')}</span></div><input type="range" min="-3000" max="5000" step="500" value={stepsDelta} onChange={e=>setStepsDelta(Number(e.target.value))} className="w-full mt-4 accent-[#16c79a]"/><div className="text-[10px] text-[#aaa09a] mt-2">Aujourd’hui : {Number.isFinite(Number(todaySteps)) ? Number(todaySteps).toLocaleString('fr-FR') : 'pas non synchronisés'}</div></label>
      </div>
      <div className="mt-4 rounded-2xl border border-[#eee7e1] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><div className="text-[11px] uppercase tracking-wide font-extrabold text-[#a89a8f]">Effet énergétique théorique</div><div className="text-lg font-extrabold text-[#2a1a12] mt-1">{result.dailyNet > 0 ? '+' : ''}{result.dailyNet} kcal/j</div><div className="text-xs text-[#8a807a] mt-1">dont {result.activityDelta > 0 ? '−' : result.activityDelta < 0 ? '+' : ''}{Math.abs(result.activityDelta)} kcal/j liés au changement de pas</div></div>
        <div className="md:text-right"><div className="text-[11px] uppercase tracking-wide font-extrabold text-[#a89a8f]">Ordre de grandeur sur 8 semaines</div><div className="text-sm font-extrabold text-[#5a4f48] mt-1">{formatKg(result.low)} à {formatKg(result.high)}</div><div className="text-[10px] text-[#aaa09a] mt-1 max-w-[310px]">Le corps s’adapte : eau, appétit, NEAT et métabolisme rendent la trajectoire réelle moins prévisible.</div></div>
      </div>
    </section>
  )
}
