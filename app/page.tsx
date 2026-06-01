'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import MetricsBar from './components/MetricsBar'
import LoggerPoids from './components/LoggerPoids'
import GraphiquePoids from './components/GraphiquePoids'
import GraphiqueCalories from './components/GraphiqueCalories'
import Nutrition from './components/Nutrition'
import Sport from './components/Sport'

export default function Home() {
  const [poids, setPoids] = useState([])
  const [repas, setRepas] = useState([])
  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [p, r, s] = await Promise.all([
      supabase.from('poids').select('*').order('date', { ascending: false }),
      supabase.from('repas').select('*').order('date', { ascending: false }),
      supabase.from('seances').select('*').order('date', { ascending: false }),
    ])
    setPoids(p.data || [])
    setRepas(r.data || [])
    setSeances(s.data || [])
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
        </div>

        <MetricsBar poids={poids} repas={repas} seances={seances} />
        <LoggerPoids poids={poids} onRefresh={fetchData} />
        <div className="grid grid-cols-2 gap-6">
          <GraphiquePoids poids={poids} />
          <GraphiqueCalories repas={repas} seances={seances} />
        </div>
        <Nutrition repas={repas} onRefresh={fetchData} />
        <Sport seances={seances} onRefresh={fetchData} />
      </div>
    </main>
  )
}