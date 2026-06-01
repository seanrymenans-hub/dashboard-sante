'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import MetricsBar from './components/MetricsBar'
import LoggerPoids from './components/LoggerPoids'
import GraphiquePoids from './components/GraphiquePoids'
import GraphiqueCalories from './components/GraphiqueCalories'
import Nutrition from './components/Nutrition'
import Sport from './components/Sport'
import SuggestionSeance from './components/SuggestionSeance'
import Parametres from './components/Parametres'

export default function Home() {
  const [poids, setPoids] = useState<any[]>([])
  const [repas, setRepas] = useState<any[]>([])
  const [seances, setSeances] = useState<any[]>([])
  const [objectifs, setObjectifs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showParametres, setShowParametres] = useState(false)

  const fetchData = useCallback(async () => {
    const [p, r, s, o] = await Promise.all([
      supabase.from('poids').select('*').order('date', { ascending: false }),
      supabase.from('repas').select('*').order('date', { ascending: false }),
      supabase.from('seances').select('*').order('date', { ascending: false }),
      supabase.from('objectifs').select('*').limit(1).single(),
    ])
    setPoids(p.data || [])
    setRepas(r.data || [])
    setSeances(s.data || [])
    setObjectifs(o.data || null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Chargement...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium">Dashboard santé</h1>
            <p className="text-sm text-gray-400 mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowParametres(true)}
            className="text-sm border border-gray-200 rounded-lg px-4 py-2"
          >
            ⚙️ Paramètres
          </button>
        </div>

        <MetricsBar poids={poids} repas={repas} seances={seances} objectifs={objectifs} />
        <LoggerPoids poids={poids} onRefresh={fetchData} />
        <div className="grid grid-cols-2 gap-6">
          <GraphiquePoids poids={poids} objectifs={objectifs} />
          <GraphiqueCalories repas={repas} seances={seances} objectifs={objectifs} />
        </div>
        <SuggestionSeance seances={seances} repas={repas} poids={poids} objectifs={objectifs} />
        <Nutrition repas={repas} onRefresh={fetchData} objectifs={objectifs} />
        <Sport seances={seances} onRefresh={fetchData} />

        {showParametres && (
          <Parametres
            onClose={() => setShowParametres(false)}
            onSave={fetchData}
          />
        )}
      </div>
    </main>
  )
}