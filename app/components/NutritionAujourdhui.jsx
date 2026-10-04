'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { addDays, dateKey } from '../../lib/dateUtils'

const FAVORITES_KEY = 'health-engine-meal-favorites-v2'

function mealKey(m) {
  return `${String(m?.nom || '').trim().toLowerCase()}|${Math.round(Number(m?.kcal || 0))}|${Math.round(Number(m?.proteines || 0))}|${Math.round(Number(m?.glucides || 0))}|${Math.round(Number(m?.lipides || 0))}`
}
function toTemplate(m) {
  return { nom: m.nom || 'Repas', type: m.type || 'dejeuner', kcal: Number(m.kcal || 0), proteines: Number(m.proteines || 0), glucides: Number(m.glucides || 0), lipides: Number(m.lipides || 0) }
}

export default function NutritionAujourdhui({ repas, objectifs, onRefresh, seances, dailyBudgets, budgetJour = 0, budget, macros }) {
  const [showLogger, setShowLogger] = useState(false)
  const [modeLogger, setModeLogger] = useState(null)
  const [typeRepas, setTypeRepas] = useState('dejeuner')
  const [nomAliment, setNomAliment] = useState('')
  const [kcalSaisie, setKcalSaisie] = useState('')
  const [protSaisie, setProtSaisie] = useState('')
  const [glucSaisie, setGlucSaisie] = useState('')
  const [lipSaisie, setLipSaisie] = useState('')
  const [descriptionIA, setDescriptionIA] = useState('')
  const [noteIA, setNoteIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [loadingAjout, setLoadingAjout] = useState(false)
  const [showBudgetDetail, setShowBudgetDetail] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [portion, setPortion] = useState(1)
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState([])
  const [productLoading, setProductLoading] = useState(false)

  const todayStr = dateKey()
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const isToday = selectedDate === todayStr

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')) } catch { setFavorites([]) }
  }, [])
  function persistFavorites(next) { setFavorites(next); localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)) }

  const repasJour = repas.filter(r => r.date === selectedDate)
  const hasMeals = repasJour.length > 0
  const previousDay = addDays(selectedDate, -1)
  const previousMeals = repas.filter(r => r.date === previousDay)
  const budgetHistorique = dailyBudgets?.find(b => b.date === selectedDate)
  const seancesDate = seances?.filter(s => s.date === selectedDate) || []
  const kcalSportDate = seancesDate.reduce((s, r) => s + (r.kcal || 0), 0)
  const tmb = objectifs?.tmb || 1875
  const deficit = objectifs?.deficit_cible || 750
  const budgetFallback = Math.max(1200, tmb + Math.round(tmb * .1) + kcalSportDate - deficit)
  const kcalObj = isToday ? (budgetJour || budgetFallback) : (budgetHistorique?.budget_jour || budgetFallback)
  const protObj = isToday ? (macros?.proteines || 166) : Math.round((objectifs?.poids_depart || 83) * 2)
  const lipObj = isToday ? (macros?.lipides || 38) : Math.round(kcalObj * .25 / 9)
  const carbObj = isToday ? (macros?.glucides || 91) : Math.max(0, Math.round((kcalObj - protObj * 4 - lipObj * 9) / 4))

  const kcalMange = Math.round(repasJour.reduce((s,r)=>s+(r.kcal||0),0))
  const protMange = Math.round(repasJour.reduce((s,r)=>s+(r.proteines||0),0))
  const carbMange = Math.round(repasJour.reduce((s,r)=>s+(r.glucides||0),0))
  const lipMange = Math.round(repasJour.reduce((s,r)=>s+(r.lipides||0),0))
  const kcalRestant = Math.max(0, kcalObj-kcalMange)
  const pctKcal = Math.min(100, Math.round(kcalMange/kcalObj*100))

  const types = [
    { value:'petit-dejeuner', label:'Petit-déj', emoji:'☀️', bg:'#faeeda', text:'#854f0b' },
    { value:'dejeuner', label:'Déjeuner', emoji:'🥗', bg:'#dceeff', text:'#185fa5' },
    { value:'snack', label:'Snack', emoji:'🍎', bg:'#d4f5ec', text:'#0f6e56' },
    { value:'diner', label:'Dîner', emoji:'🌙', bg:'#ece6ff', text:'#534ab7' },
  ]
  const typeMap = Object.fromEntries(types.map(t=>[t.value,t]))
  const macroRows = [
    {label:'Protéines', value:protMange, obj:protObj, color:'#378ADD'},
    {label:'Glucides', value:carbMange, obj:carbObj, color:'#EF9F27'},
    {label:'Lipides', value:lipMange, obj:lipObj, color:'#16c79a'},
  ]

  const recentTemplates = useMemo(() => {
    const seen = new Set(); const list = []
    for (const meal of repas) {
      if (!meal?.nom || !meal?.kcal) continue
      const key = mealKey(meal)
      if (seen.has(key)) continue
      seen.add(key); list.push(toTemplate(meal))
      if (list.length >= 10) break
    }
    return list
  }, [repas])

  function ouvrirLogger(type = 'dejeuner') { setTypeRepas(type); setModeLogger(null); setShowLogger(true); setNoteIA(''); setPortion(1) }
  function resetForm(){ setNomAliment(''); setKcalSaisie(''); setProtSaisie(''); setGlucSaisie(''); setLipSaisie(''); setDescriptionIA(''); setNoteIA(''); setModeLogger(null); setProductQuery(''); setProductResults([]); setPortion(1) }
  function fillManual(item, factor = 1) {
    setNomAliment(factor === 1 ? item.nom : `${item.nom} · ${factor}×`)
    setKcalSaisie(String(Math.round(Number(item.kcal || 0) * factor)))
    setProtSaisie(String(Math.round(Number(item.proteines || 0) * factor * 10) / 10))
    setGlucSaisie(String(Math.round(Number(item.glucides || 0) * factor * 10) / 10))
    setLipSaisie(String(Math.round(Number(item.lipides || 0) * factor * 10) / 10))
    if (item.type) setTypeRepas(item.type)
    setModeLogger('manuel')
  }

  async function ajouterTemplate(item, factor = portion) {
    const payload = {
      date:selectedDate, type:typeRepas || item.type || 'dejeuner', nom:factor === 1 ? item.nom : `${item.nom} · ${factor}×`,
      kcal:Math.round(Number(item.kcal||0)*factor), proteines:Math.round(Number(item.proteines||0)*factor*10)/10,
      glucides:Math.round(Number(item.glucides||0)*factor*10)/10, lipides:Math.round(Number(item.lipides||0)*factor*10)/10,
    }
    setLoadingAjout(true)
    const { error } = await supabase.from('repas').insert(payload)
    setLoadingAjout(false)
    if (error) return alert("Erreur lors de l'ajout du repas")
    setShowLogger(false); resetForm(); onRefresh()
  }

  async function copierJourPrecedent() {
    if (!previousMeals.length) return
    setLoadingAjout(true)
    const rows = previousMeals.map(m => ({ date:selectedDate, type:m.type, nom:m.nom, kcal:m.kcal, proteines:m.proteines||0, glucides:m.glucides||0, lipides:m.lipides||0 }))
    const { error } = await supabase.from('repas').insert(rows)
    setLoadingAjout(false)
    if (error) return alert('Impossible de copier les repas')
    setShowLogger(false); resetForm(); onRefresh()
  }

  function toggleFavorite(item) {
    const template = toTemplate(item); const key = mealKey(template)
    const exists = favorites.some(x => mealKey(x) === key)
    const next = exists ? favorites.filter(x => mealKey(x) !== key) : [template, ...favorites].slice(0, 20)
    persistFavorites(next)
  }

  async function searchProducts() {
    if (!productQuery.trim()) return
    setProductLoading(true); setProductResults([])
    try {
      const res = await fetch(`/api/food-search?query=${encodeURIComponent(productQuery.trim())}`)
      const data = await res.json()
      setProductResults(data.products || [])
    } catch { setProductResults([]) }
    setProductLoading(false)
  }

  async function estimerIA(){
    if(!descriptionIA.trim()) return
    setLoadingIA(true); setNoteIA('')
    try{
      const res = await fetch('/api/estimer-aliment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aliment:descriptionIA.trim()})})
      const data = await res.json()
      if(!res.ok || data.error) throw new Error(data.error || 'Estimation impossible')
      setNomAliment(data.nom || descriptionIA.trim()); setKcalSaisie(String(data.kcal ?? '')); setProtSaisie(String(data.proteines ?? '')); setGlucSaisie(String(data.glucides ?? '')); setLipSaisie(String(data.lipides ?? '')); setNoteIA(data.note || 'Estimation prête — vérifie les quantités avant d’ajouter.'); setModeLogger('manuel')
    }catch{ setNoteIA("Impossible d'estimer ce repas pour l'instant.") }
    setLoadingIA(false)
  }

  async function ajouterRepas(){
    const kcal = Number(kcalSaisie) || Math.round((Number(protSaisie)||0)*4+(Number(glucSaisie)||0)*4+(Number(lipSaisie)||0)*9)
    if(!nomAliment.trim() || kcal<=0) return
    setLoadingAjout(true)
    const {error}=await supabase.from('repas').insert({date:selectedDate,type:typeRepas,nom:nomAliment.trim(),kcal,proteines:Number(protSaisie)||0,glucides:Number(glucSaisie)||0,lipides:Number(lipSaisie)||0})
    setLoadingAjout(false)
    if(error){ alert("Erreur lors de l'ajout du repas"); return }
    setShowLogger(false); resetForm(); onRefresh()
  }
  async function supprimerRepas(id){ await supabase.from('repas').delete().eq('id',id); onRefresh() }

  return <div className="flex flex-col gap-[18px]">
    <div className="rounded-[26px] bg-white p-[24px_28px] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between gap-4 mb-5"><div><div className="text-[18px] font-extrabold text-[#2a1a12]">{isToday?"Aujourd'hui":new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div><div className="text-[12px] text-[#8a807a] mt-1">{hasMeals ? `${repasJour.length} repas enregistré${repasJour.length>1?'s':''}` : "Aucun repas enregistré — tes zéros ne sont pas interprétés comme une consommation réelle."}</div></div><div className="flex gap-2"><button onClick={()=>setSelectedDate(addDays(selectedDate,-1))} className="w-9 h-9 rounded-full bg-[#f9f6f3] font-bold">←</button><button disabled={isToday} onClick={()=>setSelectedDate(addDays(selectedDate,1))} className="w-9 h-9 rounded-full bg-[#f9f6f3] font-bold disabled:opacity-30">→</button></div></div>

      <div className="grid md:grid-cols-[1.25fr_.75fr] gap-4 items-stretch">
        <div className="rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white p-5 flex items-center gap-5"><div className="relative w-[82px] h-[82px] flex-none"><svg width="82" height="82" viewBox="0 0 82 82"><circle cx="41" cy="41" r="34" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="8"/><circle cx="41" cy="41" r="34" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray={2*Math.PI*34} strokeDashoffset={2*Math.PI*34*(1-pctKcal/100)} transform="rotate(-90 41 41)"/></svg><div className="absolute inset-0 flex items-center justify-center text-[14px] font-extrabold">{hasMeals?`${pctKcal}%`:'—'}</div></div><div className="flex-1 min-w-0"><div className="text-[11px] uppercase tracking-[.12em] font-bold text-white/75">Budget du jour</div><div className="text-[32px] leading-none font-extrabold mt-1">{kcalRestant}<span className="text-[14px] font-semibold ml-2">kcal restantes</span></div><div className="text-[12px] text-white/80 mt-2">{hasMeals?`${kcalMange} consommées sur ${kcalObj}`:`${kcalObj} kcal disponibles`}</div></div><button onClick={()=>setShowBudgetDetail(!showBudgetDetail)} className="w-7 h-7 rounded-full bg-white/15 text-xs font-bold">?</button></div>
        <button onClick={()=>ouvrirLogger()} className="rounded-2xl border border-[#ffe0d4] bg-[#fff7f2] p-5 text-left hover:bg-[#fff0e8] transition-colors"><div className="flex items-center justify-between"><div className="w-9 h-9 rounded-xl bg-[#ff6b4a] text-white flex items-center justify-center text-xl font-bold">+</div><span className="text-[10px] font-extrabold uppercase tracking-wide text-[#c2876b]">0 token possible</span></div><div className="text-[16px] font-extrabold text-[#2a1a12] mt-3">Ajouter un repas</div><div className="text-[12px] text-[#8a807a] mt-1">Rapide, produit, manuel ou IA</div></button>
      </div>

      {showBudgetDetail && <div className="mt-3 bg-[#fff3ea] rounded-xl p-3 text-xs text-[#5a4f48] flex flex-wrap gap-x-5 gap-y-1"><span>TMB {budget?.tmb||tmb} kcal</span><span>Sport +{budgetHistorique?.kcal_sport||kcalSportDate}</span><span>Déficit −{budgetHistorique?.deficit_cible||deficit}</span><strong className="text-[#ff6b4a]">Budget {kcalObj} kcal</strong>{budget?.budgetProvisoire && <span className="text-[#a7621f]">Pas non synchronisés → budget provisoire</span>}</div>}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">{macroRows.map(m=>{const pct=Math.min(100,Math.round(m.value/m.obj*100)); return <div key={m.label} className="rounded-xl bg-[#f9f6f3] p-3"><div className="flex justify-between items-baseline"><span className="text-[12px] font-bold" style={{color:m.color}}>{m.label}</span><span className="text-[12px] text-[#8a807a]">{hasMeals?`${m.value} / ${m.obj} g`:`— / ${m.obj} g`}</span></div><div className="h-2 bg-[#ebe5df] rounded-full mt-2 overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${hasMeals?pct:0}%`,background:m.color}}/></div></div>})}</div>
      <div className="mt-5 pt-5 border-t border-[#f3eee9] grid grid-cols-2 sm:grid-cols-4 gap-2">{types.map(t=>{const rs=repasJour.filter(r=>r.type===t.value); const kcal=rs.reduce((s,r)=>s+(r.kcal||0),0); return <button key={t.value} onClick={()=>ouvrirLogger(t.value)} className="rounded-xl p-3 text-left transition hover:-translate-y-[1px]" style={{background:rs.length?t.bg:'#f9f6f3'}}><div className="flex items-center justify-between"><span className="text-[12px] font-bold" style={{color:rs.length?t.text:'#8a807a'}}>{t.label}</span><span className="text-sm">{t.emoji}</span></div><div className="text-[11px] mt-1" style={{color:rs.length?t.text:'#b0a8a2'}}>{rs.length?`${kcal} kcal`:'+ ajouter'}</div></button>})}</div>
      {!hasMeals && isToday && <div className="mt-4 rounded-xl bg-[#eef6ff] px-4 py-3 text-[12px] font-semibold text-[#185fa5]">Aucun repas enregistré aujourd'hui. Health Engine ne considère pas cette absence comme 0 kcal consommée.</div>}
    </div>

    <div className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden"><div className="flex justify-between items-center px-7 py-5"><div className="text-[17px] font-extrabold text-[#2a1a12]">Repas du jour</div><span className="text-xs font-bold bg-[#fff3ea] text-[#c2876b] px-3 py-1.5 rounded-full">{repasJour.length} repas</span></div>{!hasMeals?<div className="px-7 pb-6 text-sm text-[#b0a8a2]">Ton historique apparaîtra ici dès le premier repas.</div>:repasJour.map((r,i)=>{const t=typeMap[r.type]||{label:r.type,bg:'#f3eee9',text:'#8a807a'}; const fav=favorites.some(x=>mealKey(x)===mealKey(r)); return <div key={r.id} className={`flex items-center gap-3 px-7 py-3.5 ${i<repasJour.length-1?'border-t border-[#f6f1ec]':''}`}><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:t.bg,color:t.text}}>{t.label}</span><div className="flex-1 min-w-0"><div className="text-sm font-bold text-[#2a1a12] truncate">{r.nom}</div><div className="text-xs text-[#b0a8a2]">P {Math.round(r.proteines||0)} · G {Math.round(r.glucides||0)} · L {Math.round(r.lipides||0)} g</div></div><strong className="text-sm">{r.kcal} kcal</strong><button title="Favori" onClick={()=>toggleFavorite(r)} className={`text-lg ${fav?'text-[#EF9F27]':'text-[#d8cfc8] hover:text-[#EF9F27]'}`}>{fav?'★':'☆'}</button><button onClick={()=>supprimerRepas(r.id)} className="text-[#d8cfc8] hover:text-[#e2553f]">✕</button></div>})}</div>

    {showLogger && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={()=>{setShowLogger(false);resetForm()}}><div className="bg-white rounded-[26px] shadow-2xl w-full max-w-[650px] max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between items-center px-7 py-5 border-b border-[#f3eee9]"><div><div className="text-[18px] font-extrabold">Ajouter un repas</div><div className="text-xs text-[#8a807a] mt-1">Le mode rapide, produit et manuel ne consomment aucun token.</div></div><button onClick={()=>{setShowLogger(false);resetForm()}} className="text-xl text-[#b0a8a2]">✕</button></div>
      <div className="p-7">
        <div className="flex gap-2 flex-wrap mb-5">{types.map(t=><button key={t.value} onClick={()=>setTypeRepas(t.value)} className="px-3 py-2 rounded-full text-xs font-bold" style={typeRepas===t.value?{background:t.bg,color:t.text}:{background:'#f9f6f3',color:'#8a807a'}}>{t.label}</button>)}</div>
        {!modeLogger && <>
          {previousMeals.length>0 && <button onClick={copierJourPrecedent} disabled={loadingAjout} className="w-full mb-3 rounded-xl bg-[#eef9f4] text-[#176b55] px-4 py-3 text-left text-sm font-extrabold">↻ Copier les {previousMeals.length} repas d'hier <span className="font-medium opacity-65">· 0 token</span></button>}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>setModeLogger('quick')} className="rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white p-5 text-left"><div className="text-lg mb-3">⚡</div><div className="font-extrabold">Ajout rapide</div><div className="text-xs text-white/75 mt-1">Récents & favoris · 0 token</div></button>
            <button onClick={()=>setModeLogger('produit')} className="rounded-2xl bg-[#eef6ff] p-5 text-left"><div className="text-lg mb-3">▦</div><div className="font-extrabold text-[#185fa5]">Produit</div><div className="text-xs text-[#185fa5]/70 mt-1">Nom ou code-barres · 0 token IA</div></button>
            <button onClick={()=>setModeLogger('manuel')} className="rounded-2xl bg-[#f9f6f3] p-5 text-left"><div className="text-lg mb-3">✎</div><div className="font-extrabold text-[#2a1a12]">Saisie manuelle</div><div className="text-xs text-[#8a807a] mt-1">Calories et macros exactes · 0 token</div></button>
            <button onClick={()=>setModeLogger('ia')} className="rounded-2xl bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white p-5 text-left"><div className="text-lg mb-3">✦</div><div className="font-extrabold">Estimer avec l'IA</div><div className="text-xs text-white/65 mt-1">Seulement quand tu veux déléguer l'estimation</div></button>
          </div>
        </>}

        {modeLogger==='quick' && <div>
          <div className="flex items-center justify-between mb-4"><button onClick={()=>setModeLogger(null)} className="text-xs font-bold text-[#8a807a]">← Modes</button><div className="flex gap-1 bg-[#f9f6f3] rounded-lg p-1">{[.5,1,1.5,2].map(x=><button key={x} onClick={()=>setPortion(x)} className={`px-2.5 py-1.5 rounded-md text-xs font-bold ${portion===x?'bg-white shadow-sm text-[#2a1a12]':'text-[#8a807a]'}`}>{x}×</button>)}</div></div>
          {favorites.length>0 && <><div className="text-[11px] uppercase tracking-wide font-extrabold text-[#a89a8f] mb-2">Favoris</div><div className="grid sm:grid-cols-2 gap-2 mb-5">{favorites.slice(0,6).map((m,i)=><QuickMeal key={`f-${i}`} item={m} portion={portion} onAdd={ajouterTemplate}/>)}</div></>}
          <div className="text-[11px] uppercase tracking-wide font-extrabold text-[#a89a8f] mb-2">Récents</div><div className="grid sm:grid-cols-2 gap-2">{recentTemplates.length?recentTemplates.map((m,i)=><QuickMeal key={`r-${i}`} item={m} portion={portion} onAdd={ajouterTemplate}/>):<div className="text-sm text-[#b0a8a2]">Tes repas récurrents apparaîtront ici.</div>}</div>
        </div>}

        {modeLogger==='produit' && <div><div className="flex gap-2"><input autoFocus value={productQuery} onChange={e=>setProductQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchProducts()} placeholder="Ex : skyr vanille ou 3017620422003" className="flex-1 border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm"/><button onClick={searchProducts} disabled={productLoading||!productQuery.trim()} className="px-4 rounded-xl bg-[#185fa5] text-white text-sm font-bold disabled:opacity-40">{productLoading?'…':'Chercher'}</button></div><div className="text-[11px] text-[#b0a8a2] mt-2">Valeurs Open Food Facts par 100 g. Vérifie toujours la portion indiquée sur l'emballage.</div><div className="mt-4 flex flex-col gap-2">{productResults.map((p,i)=><button key={i} onClick={()=>fillManual({nom:[p.nom,p.marque].filter(Boolean).join(' · '),...p.per100g})} className="rounded-xl border border-[#eee7e1] p-3 text-left hover:bg-[#f9f6f3]"><div className="font-bold text-sm text-[#2a1a12]">{p.nom}</div><div className="text-xs text-[#8a807a] mt-1">{p.marque?`${p.marque} · `:''}{p.per100g.kcal} kcal/100g · P {p.per100g.proteines} · G {p.per100g.glucides} · L {p.per100g.lipides}</div></button>)}</div><button onClick={()=>setModeLogger(null)} className="mt-4 text-xs font-bold text-[#8a807a]">← Retour</button></div>}

        {modeLogger==='ia' && <div><div className="rounded-xl bg-[#fff3ea] text-[#8a4b24] text-xs p-3 mb-3">Ce mode déclenche un appel OpenAI. Pour un repas connu, utilise plutôt Rapide ou Manuel.</div><textarea autoFocus rows={4} value={descriptionIA} onChange={e=>setDescriptionIA(e.target.value)} placeholder="Ex : 150 g de poulet, 200 g de pommes de terre rôties, courgette et 1 c. à café d'huile d'olive" className="w-full border border-[#f3eee9] rounded-xl p-3 text-sm resize-none"/><div className="flex gap-2 mt-3"><button onClick={()=>setModeLogger(null)} className="px-4 rounded-xl bg-[#f9f6f3] text-sm font-bold">Retour</button><button disabled={!descriptionIA.trim()||loadingIA} onClick={estimerIA} className="flex-1 bg-[#2a1a12] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-40">{loadingIA?'Estimation en cours…':'Estimer ce repas ✨'}</button></div></div>}

        {modeLogger==='manuel' && <div><input autoFocus value={nomAliment} onChange={e=>setNomAliment(e.target.value)} placeholder="Nom du repas" className="w-full border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm mb-3"/>{noteIA&&<div className="text-xs text-[#185fa5] bg-[#eef6ff] rounded-xl p-3 mb-3">{noteIA}</div>}<div className="grid grid-cols-2 gap-3">{[['Calories',kcalSaisie,setKcalSaisie],['Protéines (g)',protSaisie,setProtSaisie],['Glucides (g)',glucSaisie,setGlucSaisie],['Lipides (g)',lipSaisie,setLipSaisie]].map(([l,v,s])=><label key={l} className="text-xs font-bold text-[#8a807a]">{l}<input type="number" min="0" value={v} onChange={e=>s(e.target.value)} className="mt-1 w-full border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm text-[#2a1a12]"/></label>)}</div><div className="flex gap-2 mt-5"><button onClick={()=>setModeLogger(null)} className="px-4 py-3 rounded-xl bg-[#f9f6f3] text-sm font-bold">Modes</button><button disabled={loadingAjout||!nomAliment.trim()} onClick={ajouterRepas} className="flex-1 bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-40">{loadingAjout?'Ajout…':'Ajouter au journal'}</button></div></div>}
      </div>
    </div></div>}
  </div>
}

function QuickMeal({ item, portion, onAdd }) {
  return <button onClick={()=>onAdd(item, portion)} className="rounded-xl border border-[#eee7e1] p-3 text-left hover:border-[#ffc9b5] hover:bg-[#fff9f6] transition"><div className="flex justify-between gap-3"><div className="font-bold text-sm text-[#2a1a12] truncate">{item.nom}</div><div className="text-xs font-extrabold text-[#ff6b4a]">+ Ajouter</div></div><div className="text-[11px] text-[#8a807a] mt-1">{Math.round(item.kcal*portion)} kcal · P {Math.round(item.proteines*portion)} · G {Math.round(item.glucides*portion)} · L {Math.round(item.lipides*portion)}</div></button>
}
