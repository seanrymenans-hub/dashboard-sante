'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoachGlobal({ poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances, summaryCache, onSummaryUpdate }) {
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const messagesEndRef = useRef(null)

  const context = { poids, repas, seances, composition, objectifs, pas, hydratation, budget, progression, tendances }

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

  return (
    <div className="flex flex-col gap-4">

      {/* Synthèse quotidienne */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="font-medium">Synthèse du jour</div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">IA</span>
            <button
              onClick={() => { setSummary(null); setLoadingSummary(true); fetchOrGenerateSummary() }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ↺
            </button>
          </div>
        </div>

        {loadingSummary && (
          <div className="text-center py-6 text-sm text-gray-400">
            Ton coach analyse ta journée...
          </div>
        )}

        {summary && (
          <div>
            <div className="text-base font-medium text-gray-800 mb-3">{summary.titre}</div>
            <div className="text-sm text-gray-600 leading-relaxed mb-4 p-4 bg-gray-50 rounded-xl">
              {summary.bilan}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {summary.positifs?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-green-600 mb-2">✓ Points positifs</div>
                  {summary.positifs.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <span className="text-green-500 text-sm mt-0.5">✓</span>
                      <span className="text-sm text-gray-600">{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {summary.attentions?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-amber-600 mb-2">⚠ Points d'attention</div>
                  {summary.attentions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <span className="text-amber-500 text-sm mt-0.5">→</span>
                      <span className="text-sm text-gray-600">{a}</span>
                    </div>
                  ))}
                </div>
              )}
              {summary.objectifs?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-blue-600 mb-2">🎯 Objectifs</div>
                  {summary.objectifs.map((o, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <span className="text-blue-500 text-sm mt-0.5">·</span>
                      <span className="text-sm text-gray-600">{o}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
          <div>
            <div className="font-medium">Chat avec ton coach</div>
            <div className="text-xs text-gray-400 mt-1">Pose n'importe quelle question sur ta santé</div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-xs text-gray-400 hover:text-gray-600">
              Effacer
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="text-sm text-gray-400 mb-4">Exemples de questions :</div>
              <div className="flex flex-col gap-2">
                {[
                  'Pourquoi mon poids remonte-t-il ?',
                  'Est-ce que je mange assez de protéines ?',
                  'Comment était ma semaine sportive ?',
                  'Que dois-je faire aujourd\'hui pour progresser ?'
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); }}
                    className="text-xs text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-700'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {loadingChat && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400">
                Ton coach réfléchit...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-50">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Pose une question à ton coach..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && envoyerMessage()}
            />
            <button
              onClick={envoyerMessage}
              disabled={!input.trim() || loadingChat}
              className="bg-black text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}