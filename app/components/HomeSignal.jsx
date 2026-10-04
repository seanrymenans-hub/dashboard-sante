'use client'

export default function HomeSignal({ engine }) {
  const { budget, progression, tendances } = engine
  let signal = null

  if (budget.budgetProvisoire) {
    signal = {
      icon: '↻',
      title: 'Budget provisoire',
      detail: "Tes pas ne sont pas encore synchronisés aujourd’hui. Le budget s’ajustera automatiquement après la synchro Withings.",
      tone: 'bg-[#fff7ed] border-[#fde2cc] text-[#8a4b24]'
    }
  } else if (progression.tendance30j !== null && ['élevée', 'moyenne'].includes(progression.tendanceConfiance)) {
    const trend = progression.tendance30j
    signal = {
      icon: trend < 0 ? '↘' : trend > 0 ? '↗' : '→',
      title: trend < -0.05 ? 'Trajectoire en baisse' : trend > 0.05 ? 'Trajectoire en hausse' : 'Trajectoire stable',
      detail: `${Math.abs(trend).toFixed(2)} kg/semaine sur la tendance récente · confiance ${progression.tendanceConfiance}.`,
      tone: trend < -0.05 ? 'bg-[#eef9f4] border-[#d7efe5] text-[#176b55]' : 'bg-[#f8f5f2] border-[#ebe4de] text-[#6d625c]'
    }
  } else if (tendances.joursSuivis7j < 2) {
    signal = {
      icon: '○',
      title: 'Lecture encore partielle',
      detail: 'Quelques journées de nutrition supplémentaires permettront de relier plus proprement alimentation, activité et poids.',
      tone: 'bg-[#f8f5f2] border-[#ebe4de] text-[#6d625c]'
    }
  }

  if (!signal) return null

  return (
    <div className={`mb-[18px] rounded-2xl border px-4 py-3 flex items-center gap-3 ${signal.tone}`}>
      <div className="w-8 h-8 rounded-xl bg-white/75 flex items-center justify-center text-sm font-extrabold flex-none">{signal.icon}</div>
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold">{signal.title}</div>
        <div className="text-[11px] md:text-[12px] opacity-75 mt-0.5 leading-4">{signal.detail}</div>
      </div>
      <span className="ml-auto hidden md:inline text-[9px] uppercase tracking-[.08em] font-extrabold opacity-45">Health Engine · 0 token</span>
    </div>
  )
}
