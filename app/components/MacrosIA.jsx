'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function MacrosIA({ poids, seances, repas, composition, objectifs, onMacrosUpdate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  function getSemaine() {
    const now = new Date()
    const lundi = new Date(now)
    lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return lundi.toISOString().split('T')[0]
  }

  useEffect(() => {
    fetchMacrosIA()
  }, [])

  async function fetchMacrosIA() {
    const semaine = getSemaine()
    const { data: existing } = await supabase
      .from('macros_ia')
      .select('*')
      .eq('semaine', semaine)
      .single()

    if (existing) {
      setData(existing)
      onMacrosUpdate?.(existing)
    } else {
      generer()
    }
  }

  async function generer() {
    setLoading(true)
    try {
      const res = await fetch('/api/macros-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poids, seances, repas, composition, objectifs })
      })
      const result = await res.json()
      if (result.kcal) {
        const semaine = getSemaine()
        await supabase.from('macros_ia').upsert(
          { semaine, ...result },
          { onConflict: 'semaine' }
        )
        setData(result)
        onMacrosUpdate?.(result)
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const macros = data ? [
    { label: 'Protéines', value: data.proteines, unit: 'g', color: 'bg-blue-50 text-blue-700', bar: 'bg-blue-400', obj: objectifs?.proteines_objectif || 150 },
    { label: 'Glucides', value: data.glucides, unit: 'g', color: 'bg-amber-50 text-amber-700', bar: 'bg-amber-400', obj: objectifs?.glucides_objectif || 250 },
    { label: 'Lipides', value: data.lipides, unit: 'g', color: 'bg-green-50 text-green-700', bar: 'bg-green-400', obj: objectifs?.lipides_objectif || 67 },
  ] : []

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
        <div>
          <div className="font-medium">Objectifs IA de la semaine</div>
          <div className="text-xs text-gray-400 mt-1">Optimisés pour ta perte de poids rapide</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">IA</span>
          <button
            onClick={generer}
            disabled={loading}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {loading ? '...' : '↺ Recalculer'}
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading && !data && (
          <div className="text-center py-6 text-sm text-gray-400">
            L'IA calcule tes macros optimales...
          </div>
        )}

        {data && (
          <>
            <div className="bg-purple-50 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-700 mb-1">💬 {data.message}</div>
              <div className="text-xs text-purple-600">{data.ajustement}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{data.kcal}</div>
                <div className="text-xs text-red-400 mt-1">kcal objectif</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">-{data.deficit}</div>
                <div className="text-xs text-green-400 mt-1">kcal déficit</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {macros.map(m => {
                const pct = Math.min(100, Math.round(m.value / m.obj * 100))
                return (
                  <div key={m.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">{m.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.color}`}>{m.value}{m.unit}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.bar} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="text-xs text-gray-300 mt-3 text-right">
              Recalcul automatique chaque lundi
            </div>
          </>
        )}
      </div>
    </div>
  )
}