'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function WithingsSync({ onRefresh, syncPasOnly = false }) {
  const [connecte, setConnecte] = useState(false)
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(null)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.from('withings_tokens').select('id').limit(1)
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
    <div className="flex items-center gap-3">
      {succes && <span className="text-xs text-[#8a807a]">{succes}</span>}

      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-[0_4px_12px_-8px_rgba(0,0,0,0.15)]">
        <div className={`w-2 h-2 rounded-full ${connecte ? 'bg-[#16c79a]' : 'bg-[#d8cfc8]'}`} />
        <span className="text-[13px] font-semibold text-[#2a1a12]">
          {connecte ? 'Withings connecté' : 'Withings non connecté'}
        </span>
      </div>

      {connecte ? (
        <div className="flex gap-2">
          {!syncPasOnly && (
            <button
              onClick={synchroniser}
              disabled={!!loading}
              className="flex items-center gap-2 text-[13px] font-bold bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white rounded-full px-5 py-2.5 transition-all disabled:opacity-50"
            >
              <span>↻</span>{loading === 'all' ? 'Sync...' : 'Synchroniser'}
            </button>
          )}
          {syncPasOnly && (
            <button
              onClick={synchroniserPas}
              disabled={!!loading}
              className="flex items-center gap-2 text-[13px] font-bold bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white rounded-full px-5 py-2.5 transition-all disabled:opacity-50"
            >
              <span>👟</span>{loading === 'pas' ? 'Sync...' : 'Sync pas'}
            </button>
          )}
        </div>
      ) : (
        <a
          href="/api/withings/auth"
          className="text-[13px] font-bold bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-full px-5 py-2.5 shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)]"
        >
          Connecter Withings
        </a>
      )}
    </div>
  )
}