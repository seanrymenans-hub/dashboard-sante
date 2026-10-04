'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { buildCoachContext, computeCoachInsights, computeSuggestedQuestions } from '../../lib/coachContext'

const HORIZONS = [
  { id: 'today', label: "Aujourd'hui" },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
]

const QUALITY_STYLES = {
  good_data: 'bg-[#ddf7ed] text-[#15795f]',
  partial_data: 'bg-[#fff0dc] text-[#a7621f]',
  insufficient_data: 'bg-[#f5eee8] text-[#8c776c]',
  not_available: 'bg-[#f5eee8] text-[#9c918a]',
}

const INSIGHT_TONES = {
  positive: 'bg-[#e9f8f1] text-[#15795f]',
  watch: 'bg-[#fff2e3] text-[#a7621f]',
  neutral: 'bg-[#f4efeb] text-[#6d625c]',
}

export default function CoachGlobal({ poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances, macros, summaryCache, onSummaryUpdate }) {
  const [horizon, setHorizon] = useState('7d')
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const [chatError, setChatError] = useState(null)
  const messagesEndRef = useRef(null)

  const rawContext = useMemo(() => ({ poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances, macros }), [poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances, macros])
  const coachContext = useMemo(() => buildCoachContext(rawContext, horizon), [rawContext, horizon])
  const insights = useMemo(() => computeCoachInsights(coachContext), [coachContext])
  const suggestedQuestions = useMemo(() => computeSuggestedQuestions(coachContext, insights), [coachContext, insights])

  useEffect(() => {
    // On ne charge qu'une analyse déjà sauvegardée. Aucun appel OpenAI au montage.
    loadCachedSummary()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryCache])

  useEffect(() => {
    if (summary?.horizon && summary.horizon !== horizon) setSummary(null)
  }, [horizon, summary?.horizon])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadCachedSummary() {
    if (summaryCache) {
      setSummary(summaryCache)
      if (summaryCache.horizon) setHorizon(summaryCache.horizon)
      return
    }
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('daily_summary').select('*').eq('date', today).maybeSingle()
    if (data?.summary) {
      const parsed = typeof data.summary === 'string' ? JSON.parse(data.summary) : data.summary
      setSummary(parsed)
      if (parsed?.horizon) setHorizon(parsed.horizon)
      onSummaryUpdate?.(parsed)
    }
  }

  async function generateSummary() {
    if (loadingSummary) return
    setLoadingSummary(true)
    setSummaryError(null)
    try {
      const res = await fetch('/api/coach-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], context: rawContext, horizon, generateSummary: true })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.error || 'Erreur IA')
      if (result.summary) {
        setSummary(result.summary)
        onSummaryUpdate?.(result.summary)
      }
    } catch (e) {
      console.error(e)
      setSummaryError("Impossible de générer l'analyse pour le moment.")
    } finally {
      setLoadingSummary(false)
    }
  }

  async function envoyerMessage(question = null) {
    const content = (question || input).trim()
    if (!content || loadingChat) return
    const userMessage = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoadingChat(true)
    setChatError(null)
    try {
      const res = await fetch('/api/coach-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: rawContext, horizon, generateSummary: false })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur IA')
      if (data.message) setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (e) {
      console.error(e)
      setChatError("Le coach n'arrive pas à répondre pour le moment.")
    } finally {
      setLoadingChat(false)
    }
  }

  const horizonLabel = HORIZONS.find(h => h.id === horizon)?.label || '7 jours'

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Situation / synthèse */}
      <section className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden">
        <div className="px-7 pt-6 pb-4 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[14px] flex-none">✦</span>
              <div>
                <div className="text-[16px] font-extrabold">Coach Intelligence</div>
                <div className="text-xs text-white/55">Health Engine détecte. L'IA explique, uniquement quand tu le demandes.</div>
              </div>
            </div>
            <h1 className="text-[24px] font-extrabold mt-5 tracking-tight">Ton point de situation</h1>
            <p className="text-sm text-white/65 mt-1">Fiabilité des données et signaux disponibles avant toute interprétation.</p>
          </div>
          <div className="bg-white/[0.08] rounded-xl p-1 flex self-start">
            {HORIZONS.map(h => (
              <button key={h.id} onClick={() => setHorizon(h.id)} className={`px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${horizon === h.id ? 'bg-white text-[#2a1a12]' : 'text-white/60 hover:text-white'}`}>
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-7 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
            {Object.values(coachContext.dataQuality).map((q) => (
              <div key={q.label} className="rounded-xl bg-white/[0.07] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[.08em] text-white/45 font-bold mb-1.5">{q.label}</div>
                <div className="text-sm font-bold">{q.status === 'good_data' ? 'Données solides' : q.status === 'partial_data' ? 'Données partielles' : q.status === 'not_available' ? 'Non disponible' : 'Données insuffisantes'}</div>
                <div className="text-[11px] text-white/50 mt-1">{q.detail}</div>
              </div>
            ))}
          </div>

          {!summary && !loadingSummary && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-white/10 pt-5">
              <div>
                <div className="font-extrabold text-[16px]">Analyse {horizonLabel.toLowerCase()}</div>
                <div className="text-xs text-white/50 mt-1">0 token au chargement · nouvel appel uniquement sur clic</div>
              </div>
              <button onClick={generateSummary} className="rounded-xl bg-white text-[#2a1a12] px-4 py-2.5 text-sm font-extrabold hover:bg-[#fff3ea] transition-colors self-start md:self-auto">
                ✦ Analyser ma situation
              </button>
            </div>
          )}

          {loadingSummary && <div className="border-t border-white/10 pt-5 text-sm text-white/65">Ton coach croise uniquement les signaux suffisamment fiables…</div>}
          {summaryError && <div className="mt-4 text-sm text-[#ffc2b5] bg-white/[0.06] rounded-xl p-3">{summaryError}</div>}

          {summary && !loadingSummary && (
            <article className="border-t border-white/10 pt-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <div className="text-[20px] font-extrabold">{summary.titre}</div>
                  <div className="text-xs text-white/45 mt-1">Analyse {horizonLabel.toLowerCase()} · {summary.generated_at ? new Date(summary.generated_at).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : 'générée à la demande'}</div>
                </div>
                <div className="flex items-center gap-2">
                  {summary.confiance && <span className="rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white/65">Confiance {summary.confiance}</span>}
                  <button onClick={generateSummary} className="rounded-lg bg-white/[0.09] hover:bg-white/[0.15] px-3 py-1.5 text-[11px] font-bold">Actualiser ✦</button>
                </div>
              </div>

              {summary.accroche && <div className="text-[16px] font-bold text-[#ffd0b8] mb-2">{summary.accroche}</div>}
              <div className="text-sm leading-7 text-white/85 bg-white/[0.06] rounded-2xl p-4 mb-5">{summary.bilan}</div>

              <div className="grid lg:grid-cols-2 gap-5">
                {!!summary.positifs?.length && <div><div className="text-[11px] tracking-[.08em] font-extrabold text-[#7be8b5] mb-2">CE QUI VA BIEN</div>{summary.positifs.map((p,i)=><div key={i} className="flex gap-2 text-sm text-white/80 mb-2"><span className="text-[#7be8b5]">✓</span><span>{p}</span></div>)}</div>}
                {!!summary.attentions?.length && <div><div className="text-[11px] tracking-[.08em] font-extrabold text-[#ffc78a] mb-2">À GARDER À L'ŒIL</div>{summary.attentions.map((p,i)=><div key={i} className="flex gap-2 text-sm text-white/80 mb-2"><span className="text-[#ffc78a]">!</span><span>{p}</span></div>)}</div>}
              </div>

              {summary.deduction && <div className="mt-5"><div className="text-[11px] tracking-[.08em] font-extrabold text-[#b8d3ff] mb-2">CE QUE J'EN DÉDUIS</div><p className="text-sm leading-7 text-white/80">{summary.deduction}</p></div>}

              {!!summary.plan_action?.length && <div className="mt-5"><div className="text-[11px] tracking-[.08em] font-extrabold text-white/55 mb-3">PLAN D'ACTION</div><div className="grid md:grid-cols-2 gap-3">{summary.plan_action.map((a,i)=><div key={i} className="rounded-xl bg-white/[0.06] p-3.5 flex gap-3"><span className="text-xs text-white/35 font-bold">0{i+1}</span><div><div className="text-sm font-extrabold">{a.titre}</div><div className="text-xs leading-5 text-white/60 mt-1">{a.detail}</div></div></div>)}</div></div>}

              {summary.priorite && <div className="mt-5 rounded-xl bg-[#ff7a4d]/15 border border-[#ff9b78]/20 p-4"><div className="text-[10px] tracking-[.08em] text-[#ffc0a9] font-extrabold">🎯 PRIORITÉ N°1</div><div className="font-extrabold text-[15px] mt-1">{summary.priorite}</div></div>}
              {summary.limites && <div className="text-[11px] text-white/35 mt-4">{summary.limites}</div>}
            </article>
          )}
        </div>
      </section>

      {/* Signaux détectés sans IA */}
      <section className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] p-7">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="text-[18px] font-extrabold text-[#2a1a12]">Signaux détectés</div>
            <div className="text-[13px] text-[#8a807a] mt-1">Calculés par Health Engine sans IA. Clique uniquement si tu veux une interprétation.</div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[.08em] text-[#b0a8a2]">0 token</span>
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={`${insight.domain}-${i}`} className="rounded-2xl border border-[#f1ebe6] p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[.08em] text-[#a69a93] font-bold">{insight.domain}</div>
                  <div className="font-extrabold text-[#2a1a12] mt-1">{insight.title}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${INSIGHT_TONES[insight.tone] || INSIGHT_TONES.neutral}`}>{insight.tone === 'positive' ? 'Bon signal' : insight.tone === 'watch' ? 'À regarder' : 'Contexte'}</span>
              </div>
              <div className="text-[12px] leading-5 text-[#81766f]">{insight.detail}</div>
              <button onClick={() => envoyerMessage(insight.question)} className="self-start text-[12px] font-extrabold text-[#c45f3c] hover:text-[#9c4529]">Interpréter ✦</button>
            </div>
          ))}
        </div>
      </section>

      {/* Chat */}
      <section className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="flex justify-between items-center px-7 py-5 border-b border-[#f3eee9]">
          <div>
            <div className="text-[18px] font-extrabold text-[#2a1a12]">Pose-moi une question</div>
            <div className="text-[13px] text-[#8a807a] mt-0.5">Le coach utilise le contexte Health Engine et te dit aussi quand les données ne permettent pas de conclure.</div>
          </div>
          {messages.length > 0 && <button onClick={() => { setMessages([]); setChatError(null) }} className="text-xs font-semibold text-[#b0a8a2] hover:text-[#8a807a]">Effacer</button>}
        </div>

        {messages.length === 0 && (
          <div className="px-7 pt-5">
            <div className="grid md:grid-cols-2 gap-2">
              {suggestedQuestions.map((q, i) => (
                <button key={i} onClick={() => setInput(q)} className="text-left px-4 py-3 bg-[#f9f6f3] hover:bg-[#f3eee9] rounded-xl text-[13px] text-[#5a4f48] font-semibold transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="px-7 py-5 max-h-[460px] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${m.role === 'user' ? 'bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white font-medium' : 'bg-[#f9f6f3] text-[#2a1a12]'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loadingChat && <div className="flex justify-start mb-3"><div className="bg-[#f9f6f3] rounded-2xl px-4 py-3 text-sm text-[#b0a8a2]">Ton coach relie les données utiles…</div></div>}
            <div ref={messagesEndRef} />
          </div>
        )}

        {chatError && <div className="px-7 pt-4 text-sm text-[#b4533f]">{chatError}</div>}

        <div className="px-7 py-5 border-t border-[#f3eee9] mt-5">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-[#eee5de] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#ffc0a8]"
              placeholder="Pose une question à ton coach…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && envoyerMessage()}
            />
            <button onClick={() => envoyerMessage()} disabled={!input.trim() || loadingChat} className="bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl px-5 py-3 text-sm font-bold shadow-[0_8px_18px_-8px_rgba(255,107,74,0.6)] disabled:opacity-40 disabled:shadow-none">
              Envoyer
            </button>
          </div>
          <div className="text-[10px] text-[#b0a8a2] mt-2">Chaque envoi déclenche un appel IA. Rien n'est généré automatiquement.</div>
        </div>
      </section>
    </div>
  )
}
