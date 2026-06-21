'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoachGlobal({ poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances, macros, summaryCache, onSummaryUpdate }) {
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const messagesEndRef = useRef(null)

  const context = { poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances, macros }

  useEffect(() => {
    fetchOrGenerateSummary()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchOrGenerateSummary() {
    setLoadingSummary(true)
    if (summaryCache) {
      setSummary(summaryCache)
      setLoadingSummary(false)
      return
    }
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('daily_summary').select('*').eq('date', today).maybeSingle()
    if (data) {
      const parsed = typeof data.summary === 'string' ? JSON.parse(data.summary) : data.summary
      setSummary(parsed)
      onSummaryUpdate?.(parsed)
      setLoadingSummary(false)
      return
    }
    // Générer si pas encore fait aujourd'hui
    try {
      const res = await fetch('/api/coach-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], context, generateSummary: true })
      })
      const result = await res.json()
      if (result.summary) {
        setSummary(result.summary)
        onSummaryUpdate?.(result.summary)
      }
    } catch(e) { console.error(e) }
    setLoadingSummary(false)
  }

  async function envoyerMessage() {
    if (!input.trim() || loadingChat) return
    const userMessage = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoadingChat(true)
    try {
      const res = await fetch('/api/coach-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context, generateSummary: false })
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      }
    } catch(e) { console.error(e) }
    setLoadingChat(false)
  }

  const QUESTIONS_EXEMPLES = [
    'Pourquoi mon poids remonte-t-il ?',
    'Est-ce que je mange assez de protéines ?',
    'Comment était ma semaine sportive ?',
    'Que dois-je faire aujourd\'hui pour progresser ?'
  ]

  return (
    <div className="flex flex-col gap-[22px]">

      {/* Synthèse quotidienne — carte héros, même langage que Coach IA accueil */}
      <div className="rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white overflow-hidden">
        <div className="flex justify-between items-center px-7 py-5">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[13px] flex-none">✦</span>
            <div>
              <div className="text-[15px] font-extrabold">Synthèse du jour</div>
              <div className="text-xs opacity-70 mt-0.5">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setSummary(null); setLoadingSummary(true); fetchOrGenerateSummary() }}
            className="text-white/60 hover:text-white text-base transition-colors"
            title="Régénérer la synthèse"
          >
            ↺
          </button>
        </div>

        <div className="px-7 pb-7">
          {loadingSummary && (
            <div className="text-center py-6 text-sm opacity-70">
              Ton coach analyse ta journée...
            </div>
          )}

          {summary && (
            <div>
              <div className="text-[17px] font-extrabold mb-3">{summary.titre}</div>
              <div className="text-sm leading-relaxed mb-4 p-4 bg-white/[0.08] rounded-2xl font-medium opacity-95">
                {summary.bilan}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {summary.positifs?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold mb-2 tracking-wide" style={{ color: '#7be8b5' }}>✓ POINTS POSITIFS</div>
                    {summary.positifs.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <span className="text-sm mt-0.5" style={{ color: '#7be8b5' }}>✓</span>
                        <span className="text-sm opacity-90">{p}</span>
                      </div>
                    ))}
                  </div>
                )}
                {summary.attentions?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold mb-2 tracking-wide" style={{ color: '#ffc78a' }}>⚠ POINTS D'ATTENTION</div>
                    {summary.attentions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <span className="text-sm mt-0.5" style={{ color: '#ffc78a' }}>→</span>
                        <span className="text-sm opacity-90">{a}</span>
                      </div>
                    ))}
                  </div>
                )}
                {summary.objectifs?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold mb-2 tracking-wide" style={{ color: '#9fc3ff' }}>🎯 OBJECTIFS</div>
                    {summary.objectifs.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <span className="text-sm mt-0.5" style={{ color: '#9fc3ff' }}>·</span>
                        <span className="text-sm opacity-90">{o}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="flex justify-between items-center px-7 py-5 border-b border-[#f3eee9]">
          <div>
            <div className="text-[18px] font-extrabold text-[#2a1a12]">Chat avec ton coach</div>
            <div className="text-[13px] text-[#8a807a] mt-0.5">Pose n'importe quelle question sur ta santé</div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-xs font-semibold text-[#b0a8a2] hover:text-[#8a807a] transition-colors">
              Effacer
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="px-7 py-5 max-h-96 overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="text-sm text-[#b0a8a2] mb-4">Exemples de questions :</div>
              <div className="flex flex-col gap-2 max-w-md mx-auto">
                {QUESTIONS_EXEMPLES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="text-sm text-left px-4 py-2.5 bg-[#f9f6f3] hover:bg-[#f3eee9] rounded-xl text-[#5a4f48] font-medium transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white font-medium'
                  : 'bg-[#f9f6f3] text-[#2a1a12]'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {loadingChat && (
            <div className="flex justify-start mb-3">
              <div className="bg-[#f9f6f3] rounded-2xl px-4 py-3 text-sm text-[#b0a8a2]">
                Ton coach réfléchit...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-7 py-5 border-t border-[#f3eee9]">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-[#f3eee9] rounded-xl px-4 py-2.5 text-sm"
              placeholder="Pose une question à ton coach..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && envoyerMessage()}
            />
            <button
              onClick={envoyerMessage}
              disabled={!input.trim() || loadingChat}
              className="bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow-[0_8px_18px_-8px_rgba(255,107,74,0.6)] disabled:opacity-40 disabled:shadow-none transition-all"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}