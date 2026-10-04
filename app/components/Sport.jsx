'use client'
import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ImportGPX from './ImportGPX'

const EXERCICES_LIST = [
  'Pompes', 'Tractions', 'Dips', 'Squat', 'Fentes', 'Burpees',
  'Crunchs', 'Mountain climbers', 'Jumping jacks', 'Dips chaise',
  'Hip thrust', 'Relevés de jambes', 'Superman', 'Pistol squat',
  'Gainage', 'Gainage côté droit', 'Gainage côté gauche', 'Glute bridge'
]
const EXERCICES_SECONDES = ['Gainage', 'Gainage côté droit', 'Gainage côté gauche']
const TYPES = [
  { value: 'course', label: 'Course', bg: '#dceeff', text: '#185fa5' },
  { value: 'renforcement', label: 'Renforcement', bg: '#efeaff', text: '#6b4fd6' },
  { value: 'autre', label: 'Autre', bg: '#ece5dd', text: '#8a807a' },
]

function daysAgo(date) {
  return (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000
}

export default function Sport({ seances, onRefresh, poids, pas, budget }) {
  const [showLogger, setShowLogger] = useState(false)
  const [type, setType] = useState('course')
  const [nom, setNom] = useState('')
  const [duree, setDuree] = useState(30)
  const [distance, setDistance] = useState('')
  const [allureMin, setAllureMin] = useState('')
  const [allureSec, setAllureSec] = useState('')
  const [kcalManuelles, setKcalManuelles] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [groupes, setGroupes] = useState([])
  const [exercices, setExercices] = useState([{ nom: '', series: '', reps: '' }])
  const [analyse, setAnalyse] = useState(null)
  const [analyseLoading, setAnalyseLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  const groupesMusculaires = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Abdos', 'Jambes', 'Fessiers']
  const seancesSemaine = useMemo(() => (seances || []).filter(s => daysAgo(s.date) >= 0 && daysAgo(s.date) < 7), [seances])
  const seancesSemainePrec = useMemo(() => (seances || []).filter(s => daysAgo(s.date) >= 7 && daysAgo(s.date) < 14), [seances])
  const seancesReference4Sem = useMemo(() => (seances || []).filter(s => daysAgo(s.date) >= 7 && daysAgo(s.date) < 35), [seances])

  const totalMin = seancesSemaine.reduce((s, r) => s + (Number(r.duree) || 0), 0)
  const totalMinPrec = seancesSemainePrec.reduce((s, r) => s + (Number(r.duree) || 0), 0)
  const totalKcal = seancesSemaine.reduce((s, r) => s + (Number(r.kcal) || 0), 0)
  const totalKm = Math.round(seancesSemaine.filter(s => s.type === 'course').reduce((sum, s) => sum + (Number(s.distance) || 0), 0) * 10) / 10
  const nbCourse = seancesSemaine.filter(s => s.type === 'course').length
  const nbRenfo = seancesSemaine.filter(s => s.type === 'renforcement').length
  const nbAutre = seancesSemaine.filter(s => s.type === 'autre').length
  const objectifMin = 250
  const pctSemaine = Math.min(100, Math.round(totalMin / objectifMin * 100))
  const evolutionMin = totalMinPrec > 0 ? Math.round(((totalMin - totalMinPrec) / totalMinPrec) * 100) : null
  const charge = seancesSemaine.reduce((sum, s) => {
    const facteur = s.type === 'course' ? 1.15 : s.type === 'renforcement' ? 1 : 0.85
    return sum + (Number(s.duree) || 0) * facteur
  }, 0)
  const chargePrec = seancesSemainePrec.reduce((sum, s) => {
    const facteur = s.type === 'course' ? 1.15 : s.type === 'renforcement' ? 1 : 0.85
    return sum + (Number(s.duree) || 0) * facteur
  }, 0)
  const chargeReferenceTotale = seancesReference4Sem.reduce((sum, s) => {
    const facteur = s.type === 'course' ? 1.15 : s.type === 'renforcement' ? 1 : 0.85
    return sum + (Number(s.duree) || 0) * facteur
  }, 0)
  const chargeMoy4Sem = seancesReference4Sem.length > 0 ? Math.round(chargeReferenceTotale / 4) : null
  const chargeVsMoy4Sem = chargeMoy4Sem && chargeMoy4Sem > 0 ? Math.round(((charge - chargeMoy4Sem) / chargeMoy4Sem) * 100) : null
  const chargeLabel = charge === 0
    ? 'Aucune charge enregistrée'
    : chargeMoy4Sem === null
      ? 'Référence 4 sem. insuffisante'
      : chargeVsMoy4Sem > 30
        ? 'Au-dessus de ton habitude'
        : chargeVsMoy4Sem < -30
          ? 'Sous ton habitude'
          : 'Dans ta zone habituelle'
  const equilibreLabel = nbRenfo === 0 && (nbCourse + nbAutre) > 0
    ? 'Aucun renforcement enregistré'
    : nbRenfo > 0 && (nbCourse + nbAutre) > 0
      ? 'Cardio et renforcement présents'
      : nbRenfo > 0
        ? 'Renforcement dominant cette semaine'
        : 'Répartition à construire'

  const today = new Date().toISOString().split('T')[0]
  const pasAujourdhui = pas?.find(p => p.date === today)
  const pasValeur = pasAujourdhui?.nb_pas
  const pasDisponible = typeof pasValeur === 'number' && pasValeur > 0

  function toggleGroupe(g) { setGroupes(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]) }
  function addExercice() { setExercices(prev => [...prev, { nom: '', series: '', reps: '' }]) }
  function removeExercice(i) { setExercices(prev => prev.filter((_, idx) => idx !== i)) }
  function updateExercice(i, field, value) {
    setExercices(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
    setAnalyse(null)
  }

  async function analyserSeance() {
    setAnalyseLoading(true)
    try {
      const res = await fetch('/api/calories-renfo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercices, duree, poids: poids?.[0]?.valeur || 82, groupes })
      })
      const data = await res.json()
      if (data.kcal) {
        setAnalyse(data); setKcalManuelles(String(data.kcal))
        if (data.groupes?.length > 0) setGroupes(data.groupes)
      }
    } catch(e) { console.error(e) }
    setAnalyseLoading(false)
  }

  async function ajouterSeance() {
    if (!nom) return
    setLoading(true)
    const kcal = kcalManuelles ? Number(kcalManuelles) : type === 'course' ? Math.round(duree * 9) : Math.round(duree * 5)
    let notes = null
    if (type === 'course' && allureMin) notes = `Allure: ${allureMin}'${String(allureSec || 0).padStart(2, '0')}/km`
    else if (type === 'renforcement') {
      const exLog = exercices.filter(e => e.nom).map(e => `${e.nom}${e.series ? ` ${e.series}x${e.reps}` : ''}`).join(' · ')
      notes = [groupes.length ? groupes.join(', ') : '', exLog, analyse?.zone ? `Zone: ${analyse.zone}` : ''].filter(Boolean).join(' | ')
    }
    await supabase.from('seances').insert({ date, type, nom, duree: Number(duree), kcal, distance: distance ? Number(distance) : 0, notes })
    setNom(''); setDuree(30); setDistance(''); setAllureMin(''); setAllureSec(''); setKcalManuelles(''); setGroupes([])
    setExercices([{ nom: '', series: '', reps: '' }]); setAnalyse(null); setDate(new Date().toISOString().split('T')[0])
    setLoading(false); setShowLogger(false); onRefresh()
  }

  async function supprimerSeance(id) { await supabase.from('seances').delete().eq('id', id); onRefresh() }
  const exercicesRemplis = exercices.some(e => e.nom.trim() !== '')
  const typeInfo = (t) => TYPES.find(x => x.value === t) || TYPES[2]

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Pilotage hebdomadaire */}
      <section className="rounded-[26px] bg-white p-[24px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <div className="text-[18px] font-extrabold text-[#2a1a12]">Cette semaine</div>
            <div className="text-[13px] text-[#8a807a] mt-0.5">Ton volume, ton équilibre et ta charge récente</div>
          </div>
          <button onClick={() => setShowLogger(true)} className="text-[13px] font-bold bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-full px-5 py-2.5 shadow-[0_8px_18px_-8px_rgba(255,107,74,0.6)]">
            + Ajouter une séance
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          {[
            ['Séances', seancesSemaine.length, '/ 4 cible'],
            ['Minutes', totalMin, `/ ${objectifMin}`],
            ['Course', `${totalKm} km`, `${nbCourse} sortie${nbCourse > 1 ? 's' : ''}`],
            ['Kcal sport', totalKcal, 'estimées'],
          ].map(([label, value, sub]) => (
            <div key={label} className="rounded-2xl bg-[#f9f6f3] p-3.5 min-w-0">
              <div className="text-[10px] uppercase tracking-wide font-bold text-[#b0a8a2]">{label}</div>
              <div className="text-xl font-extrabold text-[#2a1a12] mt-1 truncate">{value}</div>
              <div className="text-[11px] text-[#8a807a] mt-1 truncate">{sub}</div>
            </div>
          ))}
          <div className="rounded-2xl bg-[#f9f6f3] p-3.5 min-w-0">
            <div className="text-[10px] uppercase tracking-wide font-bold text-[#b0a8a2]">Charge indicative</div>
            <div className="flex items-baseline gap-1.5 mt-1"><div className="text-xl font-extrabold text-[#2a1a12]">{Math.round(charge)}</div><div className="text-[10px] text-[#b0a8a2]">pts</div></div>
            <div className="text-[11px] text-[#8a807a] mt-1 leading-tight">{chargeLabel}</div>
            {chargeMoy4Sem !== null && <div className="text-[10px] text-[#b0a8a2] mt-1">Moy. 4 sem. : {chargeMoy4Sem}{chargeVsMoy4Sem !== null ? ` · ${chargeVsMoy4Sem >= 0 ? '+' : ''}${chargeVsMoy4Sem}%` : ''}</div>}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-semibold text-[#8a807a] mb-1.5">
              <span>Objectif activité</span><span>{totalMin} / {objectifMin} min</span>
            </div>
            <div className="h-2 bg-[#f3eee9] rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] to-[#a78bff]" style={{ width: `${pctSemaine}%` }} /></div>
          </div>
          <div>
            <div className="flex gap-2 flex-wrap text-xs font-bold">
              <span className="px-3 py-1.5 rounded-full bg-[#dceeff] text-[#185fa5]">🏃 {nbCourse} course{nbCourse > 1 ? 's' : ''}</span>
              <span className="px-3 py-1.5 rounded-full bg-[#efeaff] text-[#6b4fd6]">💪 {nbRenfo} renfo</span>
              <span className="px-3 py-1.5 rounded-full bg-[#ece5dd] text-[#8a807a]">⚡ {nbAutre} autre{nbAutre > 1 ? 's' : ''}</span>
              {evolutionMin !== null && <span className="px-3 py-1.5 rounded-full bg-[#d4f5ec] text-[#0f6e56]">{evolutionMin >= 0 ? '+' : ''}{evolutionMin}% vs sem. préc.</span>}
            </div>
            <div className="text-[11px] text-[#8a807a] mt-2 md:text-right"><span className="font-bold text-[#5f554f]">Équilibre :</span> {equilibreLabel}</div>
          </div>
        </div>

        {seancesSemaine.length === 0 ? (
          <div className="mt-4 text-sm text-[#8a807a] bg-[#fffaf6] border border-[#f3eee9] rounded-2xl px-4 py-3">Aucune séance enregistrée cette semaine. Ce n’est pas interprété comme de l’inactivité tant que les données ne sont pas complètes.</div>
        ) : (
          <div className="mt-4 grid md:grid-cols-2 gap-2">
            {seancesSemaine.slice(0, 4).map(s => {
              const ti = typeInfo(s.type)
              return <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#fffaf6] px-4 py-3 border border-[#f3eee9]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: ti.bg, color: ti.text }}>{ti.label}</span><span className="text-sm font-bold text-[#2a1a12] truncate">{s.nom}</span></div>
                  <div className="text-[11px] text-[#b0a8a2] mt-1">{s.duree} min{s.distance > 0 ? ` · ${s.distance} km` : ''} · {s.kcal} kcal</div>
                </div>
                <button onClick={() => supprimerSeance(s.id)} className="text-[#d8cfc8] hover:text-[#e2553f]">✕</button>
              </div>
            })}
          </div>
        )}
      </section>

      {/* Mouvement du jour, volontairement secondaire */}
      <section className="rounded-[26px] bg-white p-[20px_24px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div><div className="text-[16px] font-extrabold text-[#2a1a12]">Mouvement aujourd’hui</div><div className="text-xs text-[#8a807a] mt-0.5">Activité quotidienne, séparée de l’entraînement</div></div>
          <span className="text-[11px] font-bold text-[#b0a8a2]">Withings</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-[#dceeff] rounded-2xl p-3 text-center"><div className="text-lg font-extrabold text-[#185fa5]">{pasDisponible ? pasValeur.toLocaleString('fr-FR') : '—'}</div><div className="text-[11px] text-[#378ADD] font-semibold mt-1">pas {pasDisponible ? '' : '· non synchronisés'}</div></div>
          <div className="bg-[#fff3ea] rounded-2xl p-3 text-center"><div className="text-lg font-extrabold text-[#c2876b]">{pasDisponible ? (budget?.kcalPas || 0) : '—'}</div><div className="text-[11px] text-[#ff8a3d] font-semibold mt-1">kcal activité {pasDisponible ? '' : '· inconnues'}</div></div>
          <div className="bg-[#efeaff] rounded-2xl p-3 text-center"><div className="text-lg font-extrabold text-[#6b4fd6]">{budget?.kcalSport || 0}</div><div className="text-[11px] text-[#7c5cff] font-semibold mt-1">kcal entraînement</div></div>
          <div className="bg-[#f9f6f3] rounded-2xl p-3 text-center"><div className="text-lg font-extrabold text-[#2a1a12]">{(budget?.depenseTotal || 0).toLocaleString('fr-FR')}</div><div className="text-[11px] text-[#8a807a] font-semibold mt-1">dépense estimée{pasDisponible ? '' : ' · hors activité non sync.'}</div></div>
        </div>
      </section>

      {showLogger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={() => setShowLogger(false)}>
          <div className="bg-white rounded-[26px] shadow-2xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-7 py-5 border-b border-[#f3eee9]"><span className="text-[18px] font-extrabold text-[#2a1a12]">Ajouter une séance</span><button onClick={() => setShowLogger(false)} className="text-[#b0a8a2] hover:text-[#2a1a12] text-xl">✕</button></div>
            <div className="px-7 py-6">
              <div className="flex gap-2 mb-4">{TYPES.map(t => <button key={t.value} onClick={() => { setType(t.value); setGroupes([]); setAnalyse(null) }} className="flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold" style={type === t.value ? { background: t.bg, color: t.text } : { background: '#f9f6f3', color: '#8a807a' }}>{t.label}</button>)}</div>
              <div className="flex gap-2 mb-3"><input autoFocus className="flex-1 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm" placeholder="Nom de la séance..." value={nom} onChange={e => setNom(e.target.value)} /><input type="date" className="border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="flex gap-2 flex-wrap mb-3 items-end">
                <label className="text-[11px] font-semibold text-[#b0a8a2]">Durée<input type="number" className="block w-24 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm mt-1" value={duree} onChange={e => setDuree(e.target.value)} /></label>
                <label className="text-[11px] font-semibold text-[#b0a8a2]">Kcal (optionnel)<input type="number" className="block w-32 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm mt-1" placeholder="auto si vide" value={kcalManuelles} onChange={e => setKcalManuelles(e.target.value)} /></label>
                {type === 'course' && <><label className="text-[11px] font-semibold text-[#b0a8a2]">Distance<input type="number" className="block w-24 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm mt-1" placeholder="km" value={distance} onChange={e => setDistance(e.target.value)} /></label><label className="text-[11px] font-semibold text-[#b0a8a2]">Allure /km<div className="flex items-center gap-1 mt-1"><input type="number" className="w-16 border border-[#f3eee9] rounded-xl px-3 py-2.5 text-sm" placeholder="min" value={allureMin} onChange={e => setAllureMin(e.target.value)} /><span>'</span><input type="number" className="w-16 border border-[#f3eee9] rounded-xl px-3 py-2.5 text-sm" placeholder="sec" value={allureSec} onChange={e => setAllureSec(e.target.value)} /></div></label></>}
              </div>
              {type === 'renforcement' && <div className="mb-3">
                <div className="text-xs font-semibold text-[#8a807a] mb-2 mt-3">Groupes musculaires</div><div className="flex flex-wrap gap-2 mb-4">{groupesMusculaires.map(g => <button key={g} onClick={() => toggleGroupe(g)} className="text-xs font-semibold px-3.5 py-1.5 rounded-full" style={groupes.includes(g) ? { background: '#efeaff', color: '#6b4fd6' } : { background: '#f9f6f3', color: '#8a807a' }}>{g}</button>)}</div>
                <div className="text-xs font-semibold text-[#8a807a] mb-2">Exercices</div>{exercices.map((ex, i) => <div key={i} className="flex gap-2 items-center mb-2"><select className="flex-1 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm" value={ex.nom} onChange={e => updateExercice(i, 'nom', e.target.value)}><option value="">Sélectionner...</option>{EXERCICES_LIST.map(e => <option key={e} value={e}>{e}</option>)}</select><input type="number" className="w-16 border border-[#f3eee9] rounded-xl px-3 py-2.5 text-sm" placeholder="séries" value={ex.series} onChange={e => updateExercice(i, 'series', e.target.value)} /><span className="text-xs">×</span><input type="number" className="w-16 border border-[#f3eee9] rounded-xl px-3 py-2.5 text-sm" placeholder={EXERCICES_SECONDES.includes(ex.nom) ? 'sec' : 'reps'} value={ex.reps} onChange={e => updateExercice(i, 'reps', e.target.value)} />{exercices.length > 1 && <button onClick={() => removeExercice(i)}>✕</button>}</div>)}
                <button onClick={addExercice} className="text-xs font-bold text-[#7c5cff] mt-1 mb-4">+ Ajouter un exercice</button>
                {exercicesRemplis && <div><button onClick={analyserSeance} disabled={analyseLoading} className="w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40" style={{ background: '#efeaff', color: '#6b4fd6' }}>{analyseLoading ? 'Analyse en cours...' : 'Estimer cette séance ✨'}</button>{analyse && <div className="mt-3 rounded-2xl p-4 bg-[#efeaff]"><div className="flex justify-between"><span className="text-sm font-bold text-[#6b4fd6]">{analyse.kcal} kcal estimées</span><span className="text-xs font-bold bg-white px-3 py-1 rounded-full text-[#6b4fd6]">{analyse.zone}</span></div><div className="text-xs text-[#6b4fd6] mt-2">{analyse.explication}</div></div>}</div>}
              </div>}
              <div className="mt-2 mb-3"><ImportGPX onRefresh={onRefresh} poids={poids?.[0]?.valeur} /></div>
              <button onClick={ajouterSeance} disabled={loading || !nom} className="w-full bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40">{loading ? '...' : '+ Ajouter la séance'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
