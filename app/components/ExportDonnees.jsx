'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'

const PERIODES = [
  { label: '7 jours', jours: 7 },
  { label: '30 jours', jours: 30 },
  { label: '90 jours', jours: 90 },
  { label: 'Tout', jours: 9999 },
]

export default function ExportDonnees({ poids, composition, repas, seances, pas, dailyBudgets, objectifs }) {
  const [periode, setPeriode] = useState(30)
  const [loading, setLoading] = useState(false)

  function filtrer(tableau, champDate) {
    if (periode === 9999) return tableau
    const limite = new Date()
    limite.setDate(limite.getDate() - periode)
    return tableau.filter(r => new Date(r[champDate]) >= limite)
  }

  function exporterExcel() {
    setLoading(true)
    try {
      const wb = XLSX.utils.book_new()

      // ── Feuille 1 : Résumé jour par jour ──────────────────────────────────
      // Construire une liste de dates uniques sur la période
      const toutesLesDates = [
        ...new Set([
          ...filtrer(poids || [], 'date').map(r => r.date),
          ...filtrer(repas || [], 'date').map(r => r.date),
          ...filtrer(seances || [], 'date').map(r => r.date),
          ...filtrer(pas || [], 'date').map(r => r.date),
          ...filtrer(dailyBudgets || [], 'date').map(r => r.date),
        ])
      ].sort((a, b) => b.localeCompare(a)) // du plus récent au plus ancien

      const resumeRows = toutesLesDates.map(date => {
        const poidsJour = poids?.find(p => p.date === date)
        const comp = composition?.find(c => c.date === date)
        const repasJour = repas?.filter(r => r.date === date) || []
        const seancesJour = seances?.filter(s => s.date === date) || []
        const pasJour = pas?.find(p => p.date === date)
        const budget = dailyBudgets?.find(b => b.date === date)

        const kcalMangees = repasJour.reduce((s, r) => s + (r.kcal || 0), 0)
        const proteines = repasJour.reduce((s, r) => s + (r.proteines || 0), 0)
        const glucides = repasJour.reduce((s, r) => s + (r.glucides || 0), 0)
        const lipides = repasJour.reduce((s, r) => s + (r.lipides || 0), 0)
        const kcalSport = seancesJour.reduce((s, r) => s + (r.kcal || 0), 0)
        const nbSeances = seancesJour.length
        const typeSeances = seancesJour.map(s => s.type).join(', ')

        return {
          'Date': date,
          'Poids (kg)': poidsJour?.valeur || '',
          'Masse grasse (kg)': comp?.masse_grasse || '',
          'Masse grasse (%)': comp?.masse_grasse_pct || '',
          'Masse musculaire (kg)': comp?.masse_musculaire || '',
          'Masse musculaire (%)': comp?.masse_musculaire_pct || '',
          'Masse hydrique (kg)': comp?.masse_hydrique || '',
          'Pas': pasJour?.nb_pas || '',
          'Kcal pas': pasJour ? Math.round((pasJour.nb_pas || 0) * 0.04) : '',
          'Kcal mangées': kcalMangees || '',
          'Protéines (g)': Math.round(proteines) || '',
          'Glucides (g)': Math.round(glucides) || '',
          'Lipides (g)': Math.round(lipides) || '',
          'Nb séances sport': nbSeances || '',
          'Types séances': typeSeances || '',
          'Kcal sport': kcalSport || '',
          'Budget jour (kcal)': budget?.budget_jour || '',
          'TMB': budget?.tmb || objectifs?.tmb || '',
          'Déficit cible': budget?.deficit_cible || objectifs?.deficit_cible || '',
          'Solde (mangé - budget)': budget?.budget_jour && kcalMangees ? kcalMangees - budget.budget_jour : '',
        }
      })

      const wsResume = XLSX.utils.json_to_sheet(resumeRows)
      wsResume['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
        { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
        { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
        { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
        { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 22 },
      ]
      XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé par jour')

      // ── Feuille 2 : Détail repas ───────────────────────────────────────────
      const repasRows = filtrer(repas || [], 'date')
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(r => ({
          'Date': r.date,
          'Type': r.type,
          'Aliment': r.nom,
          'Kcal': r.kcal || 0,
          'Protéines (g)': Math.round(r.proteines || 0),
          'Glucides (g)': Math.round(r.glucides || 0),
          'Lipides (g)': Math.round(r.lipides || 0),
        }))

      const wsRepas = XLSX.utils.json_to_sheet(repasRows)
      wsRepas['!cols'] = [
        { wch: 12 }, { wch: 16 }, { wch: 40 },
        { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, wsRepas, 'Détail repas')

      // ── Feuille 3 : Séances sport ──────────────────────────────────────────
      const seancesRows = filtrer(seances || [], 'date')
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(s => ({
          'Date': s.date,
          'Type': s.type,
          'Nom': s.nom,
          'Durée (min)': s.duree || '',
          'Distance (km)': s.distance || '',
          'Kcal': s.kcal || '',
          'Notes': s.notes || '',
        }))

      const wsSeances = XLSX.utils.json_to_sheet(seancesRows)
      wsSeances['!cols'] = [
        { wch: 12 }, { wch: 14 }, { wch: 30 },
        { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 50 }
      ]
      XLSX.utils.book_append_sheet(wb, wsSeances, 'Séances sport')

      // ── Feuille 4 : Objectifs et contexte ─────────────────────────────────
      const objRows = [
        { 'Paramètre': 'Poids de départ (kg)', 'Valeur': objectifs?.poids_depart || '' },
        { 'Paramètre': 'Poids objectif (kg)', 'Valeur': objectifs?.poids_objectif || '' },
        { 'Paramètre': 'TMB (kcal)', 'Valeur': objectifs?.tmb || '' },
        { 'Paramètre': 'Déficit cible (kcal)', 'Valeur': objectifs?.deficit_cible || '' },
        { 'Paramètre': 'Objectif protéines (g)', 'Valeur': objectifs?.proteines_objectif || '' },
      ]
      const wsObj = XLSX.utils.json_to_sheet(objRows)
      wsObj['!cols'] = [{ wch: 30 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, wsObj, 'Objectifs')

      // ── Export ─────────────────────────────────────────────────────────────
      const dateStr = new Date().toISOString().split('T')[0]
      const periodeLabel = PERIODES.find(p => p.jours === periode)?.label.replace(' ', '') || '30j'
      XLSX.writeFile(wb, `HealthEngine_${dateStr}_${periodeLabel}.xlsx`)
    } catch (e) {
      console.error('Erreur export Excel:', e)
    }
    setLoading(false)
  }

  return (
    <div className="rounded-[26px] bg-white p-[26px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">Export des données</div>
          <div className="text-[13px] text-[#8a807a] mt-0.5">Télécharge un Excel avec toutes tes données</div>
        </div>
        <span className="text-xs font-bold bg-[#d4f5ec] text-[#13a884] px-3 py-1.5 rounded-full">4 feuilles</span>
      </div>

      <div className="flex gap-1 bg-[#f9f6f3] rounded-xl p-1 mb-5">
        {PERIODES.map(p => (
          <button
            key={p.jours}
            onClick={() => setPeriode(p.jours)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              periode === p.jours ? 'bg-white text-[#2a1a12] shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-[#8a807a]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 mb-5 text-xs text-[#8a807a]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a3d] flex-shrink-0" />
          <span><span className="font-bold text-[#2a1a12]">Résumé par jour</span> — poids, composition, nutrition, pas, sport, budget</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16c79a] flex-shrink-0" />
          <span><span className="font-bold text-[#2a1a12]">Détail repas</span> — chaque repas avec ses macros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cff] flex-shrink-0" />
          <span><span className="font-bold text-[#2a1a12]">Séances sport</span> — chaque séance avec distance, durée, notes</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD] flex-shrink-0" />
          <span><span className="font-bold text-[#2a1a12]">Objectifs</span> — tes paramètres de référence</span>
        </div>
      </div>

      <button
        onClick={exporterExcel}
        disabled={loading}
        className="w-full bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl px-4 py-3 text-sm font-bold shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
      >
        {loading ? 'Génération...' : '⬇ Télécharger l\'Excel'}
      </button>
    </div>
  )
}