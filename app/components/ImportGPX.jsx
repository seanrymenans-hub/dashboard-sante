'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function toRad(deg) { return deg * Math.PI / 180 }

function distanceEntre(p1, p2) {
  const R = 6371
  const dLat = toRad(p2.lat - p1.lat)
  const dLon = toRad(p2.lon - p1.lon)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function parseGPX(text, poids) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const nom = doc.querySelector('name')?.textContent || 'Course importée'
  const points = [...doc.querySelectorAll('trkpt')].map(p => ({
    lat: parseFloat(p.getAttribute('lat')),
    lon: parseFloat(p.getAttribute('lon')),
    time: new Date(p.querySelector('time')?.textContent || '')
  }))

  if (points.length < 2) return null

  let distance = 0
  for (let i = 1; i < points.length; i++) {
    distance += distanceEntre(points[i-1], points[i])
  }

  const debut = points[0].time
  const fin = points[points.length - 1].time
  const dureeMs = fin - debut
  const dureeMin = Math.round(dureeMs / 60000)
  const date = debut.toISOString().split('T')[0]
  const allure = distance > 0 ? dureeMin / distance : 0
  const allureMin = Math.floor(allure)
  const allureSec = Math.round((allure - allureMin) * 60)
  const kcal = Math.round(distance * (poids || 82) * 1.05)

  return {
    nom,
    date,
    duree: dureeMin,
    distance: Math.round(distance * 100) / 100,
    allure: `${allureMin}'${allureSec.toString().padStart(2,'0')}/km`,
    kcal,
    type: 'course'
  }
}

export default function ImportGPX({ onRefresh, poids }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState(null)

  function onFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = parseGPX(ev.target.result, poids)
      if (result) setPreview(result)
      else setErreur('Fichier GPX invalide')
    }
    reader.readAsText(file)
  }

  async function importer() {
    if (!preview) return
    setLoading(true)
    await supabase.from('seances').insert({
      date: preview.date,
      type: preview.type,
      nom: preview.nom,
      duree: preview.duree,
      distance: preview.distance,
      kcal: preview.kcal,
      notes: `Allure: ${preview.allure} · Importé via GPX`
    })
    setLoading(false)
    setSucces(true)
    setPreview(null)
    setTimeout(() => setSucces(false), 2000)
    onRefresh()
  }

  return (
    <div className="border border-dashed border-gray-200 rounded-xl p-4 mb-4">
      <div className="text-xs text-gray-400 mb-3 font-medium">📁 Importer un fichier GPX (Strava)</div>

      {!preview && (
        <label className="cursor-pointer">
          <div className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <span className="bg-gray-100 rounded-lg px-3 py-1.5 text-xs">Choisir un fichier .gpx</span>
            <span className="text-xs text-gray-400">depuis Strava → activité → ··· → Exporter GPX</span>
          </div>
          <input type="file" accept=".gpx" onChange={onFile} className="hidden" />
        </label>
      )}

      {preview && (
        <div>
          <div className="bg-green-50 rounded-lg p-3 mb-3">
            <div className="text-sm font-medium text-gray-800 mb-2">{preview.nom}</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div><span className="text-gray-400">Date</span><div className="font-medium">{new Date(preview.date).toLocaleDateString('fr-FR')}</div></div>
              <div><span className="text-gray-400">Distance</span><div className="font-medium">{preview.distance} km</div></div>
              <div><span className="text-gray-400">Durée</span><div className="font-medium">{preview.duree} min</div></div>
              <div><span className="text-gray-400">Allure</span><div className="font-medium">{preview.allure}</div></div>
            </div>
            <div className="text-xs text-gray-400 mt-2">~{preview.kcal} kcal estimées</div>
          </div>
          <div className="flex gap-2">
            <button onClick={importer} disabled={loading} className={`flex-1 text-sm py-2 rounded-lg ${succes ? 'bg-green-500 text-white' : 'bg-black text-white'}`}>
              {loading ? 'Import...' : succes ? '✓ Importé !' : 'Importer cette séance'}
            </button>
            <button onClick={() => setPreview(null)} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500">
              Annuler
            </button>
          </div>
        </div>
      )}

      {erreur && <div className="text-xs text-red-500 mt-2">{erreur}</div>}
    </div>
  )
}