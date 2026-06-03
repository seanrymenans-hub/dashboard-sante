'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function WithingsSync({ onRefresh, syncPasOnly = false }) {
  const [connecte, setConnecte] = useState(false)
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(null)

  useEffect(() => {
    async function check() {
  const { data, error } = await supabase.from('withings_tokens').select('id').limit(1)
  console.log('Withings check:', data, error)
  setConnecte(data && data.length > 0)
}
    check()
    if (window.location.search.includes('withings=connected')) {
      setConnecte(true)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  async function synchroniser() {
    setLoading('all')
    setSucces(null)
    try {
      const res = await fetch('/api/withings/sync')
      const data = await res.json()
      if (data.success) {
        setSucces(`✓ ${data.total} mesures · ${data.pasSynced} jours de pas`)
        onRefresh()
      } else {
        setSucces('Erreur : ' + (data.error || 'inconnue'))
      }
    } catch {
      setSucces('Erreur de connexion')
    }
    setLoading(false)
  }

  async function synchroniserPas() {
    setLoading('pas')
    setSucces(null)
    try {
      const res = await fetch('/api/withings/sync?pas=1')
      const data = await res.json()
      if (data.success) {
        setSucces(`✓ ${data.pasSynced} jours de pas synchronisés`)
        onRefresh()
      } else {
        setSucces('Erreur : ' + (data.error || 'inconnue'))
      }
    } catch {
      setSucces('Erreur de connexion')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${connecte ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div>
          <div className="text-sm font-medium">Withings</div>
          <div className="text-xs text-gray-400">{connecte ? (syncPasOnly ? 'Connecté · pas et activité' : 'Connecté · poids et composition auto') : 'Non connecté'}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {succes && <span className="text-xs text-gray-400">{succes}</span>}
        {connecte ? (
          <div className="flex gap-2">
            {!syncPasOnly && (
              <button onClick={synchroniser} disabled={!!loading} className="text-sm border border-gray-200 rounded-lg px-4 py-1.5">
                {loading === 'all' ? 'Sync...' : '↻ Synchroniser'}
              </button>
            )}
            {syncPasOnly && (
              <button onClick={synchroniserPas} disabled={!!loading} className="text-sm border border-gray-200 rounded-lg px-4 py-1.5">
                {loading === 'pas' ? 'Sync...' : '👟 Sync pas'}
              </button>
            )}
          </div>
        ) : (
          <a href="/api/withings/auth" className="text-sm bg-black text-white rounded-lg px-4 py-1.5">
            Connecter Withings
          </a>
        )}
      </div>
    </div>
  )
}