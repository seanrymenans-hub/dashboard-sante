'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [poids, setPoids] = useState([])

  useEffect(() => {
    async function fetchPoids() {
      const { data } = await supabase.from('poids').select('*').order('date', { ascending: false })
      if (data) setPoids(data)
    }
    fetchPoids()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-medium mb-6">Dashboard santé</h1>
      <p className="text-gray-500">Connexion Supabase : {poids !== null ? '✓ OK' : '...'}</p>
    </main>
  )
}