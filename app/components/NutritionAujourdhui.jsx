'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

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

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const isToday = selectedDate === todayStr
  const repasJour = repas.filter(r => r.date === selectedDate)
  const hasMeals = repasJour.length > 0
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

  function ouvrirLogger(type = 'dejeuner') { setTypeRepas(type); setModeLogger(null); setShowLogger(true); setNoteIA('') }
  function resetForm(){ setNomAliment(''); setKcalSaisie(''); setProtSaisie(''); setGlucSaisie(''); setLipSaisie(''); setDescriptionIA(''); setNoteIA(''); setModeLogger(null) }

  async function estimerIA(){
    if(!descriptionIA.trim()) return
    setLoadingIA(true); setNoteIA('')
    try{
      const res = await fetch('/api/estimer-aliment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aliment:descriptionIA.trim()})})
      const data = await res.json()
      if(!res.ok || data.error) throw new Error(data.error || 'Estimation impossible')
      setNomAliment(data.nom || descriptionIA.trim()); setKcalSaisie(String(data.kcal ?? '')); setProtSaisie(String(data.proteines ?? '')); setGlucSaisie(String(data.glucides ?? '')); setLipSaisie(String(data.lipides ?? '')); setNoteIA(data.note || 'Estimation prête — vérifie les quantités avant d’ajouter.'); setModeLogger('manuel')
    }catch(e){ setNoteIA("Impossible d'estimer ce repas pour l'instant.") }
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
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <div className="text-[18px] font-extrabold text-[#2a1a12]">{isToday?"Aujourd'hui":new Date(selectedDate).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
          <div className="text-[12px] text-[#8a807a] mt-1">{hasMeals ? `${repasJour.length} repas enregistré${repasJour.length>1?'s':''}` : "Aucun repas enregistré — tes zéros ne sont pas interprétés comme une consommation réelle."}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>{const d=new Date(selectedDate);d.setDate(d.getDate()-1);setSelectedDate(d.toISOString().split('T')[0])}} className="w-9 h-9 rounded-full bg-[#f9f6f3] font-bold">←</button>
          <button disabled={isToday} onClick={()=>{const d=new Date(selectedDate);d.setDate(d.getDate()+1);setSelectedDate(d.toISOString().split('T')[0])}} className="w-9 h-9 rounded-full bg-[#f9f6f3] font-bold disabled:opacity-30">→</button>
        </div>
      </div>

      <div className="grid grid-cols-[1.25fr_.75fr] gap-4 items-stretch">
        <div className="rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white p-5 flex items-center gap-5">
          <div className="relative w-[82px] h-[82px] flex-none">
            <svg width="82" height="82" viewBox="0 0 82 82"><circle cx="41" cy="41" r="34" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="8"/><circle cx="41" cy="41" r="34" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray={2*Math.PI*34} strokeDashoffset={2*Math.PI*34*(1-pctKcal/100)} transform="rotate(-90 41 41)"/></svg>
            <div className="absolute inset-0 flex items-center justify-center text-[14px] font-extrabold">{hasMeals?`${pctKcal}%`:'—'}</div>
          </div>
          <div className="flex-1 min-w-0"><div className="text-[11px] uppercase tracking-[.12em] font-bold text-white/75">Budget du jour</div><div className="text-[32px] leading-none font-extrabold mt-1">{kcalRestant}<span className="text-[14px] font-semibold ml-2">kcal restantes</span></div><div className="text-[12px] text-white/80 mt-2">{hasMeals?`${kcalMange} consommées sur ${kcalObj}`:`${kcalObj} kcal disponibles`}</div></div>
          <button onClick={()=>setShowBudgetDetail(!showBudgetDetail)} className="w-7 h-7 rounded-full bg-white/15 text-xs font-bold">?</button>
        </div>
        <button onClick={()=>ouvrirLogger()} className="rounded-2xl border border-[#ffe0d4] bg-[#fff7f2] p-5 text-left hover:bg-[#fff0e8] transition-colors">
          <div className="w-9 h-9 rounded-xl bg-[#ff6b4a] text-white flex items-center justify-center text-xl font-bold mb-3">+</div><div className="text-[16px] font-extrabold text-[#2a1a12]">Ajouter un repas</div><div className="text-[12px] text-[#8a807a] mt-1">IA ou saisie manuelle</div>
        </button>
      </div>

      {showBudgetDetail && <div className="mt-3 bg-[#fff3ea] rounded-xl p-3 text-xs text-[#5a4f48] flex flex-wrap gap-x-5 gap-y-1"><span>TMB {budget?.tmb||tmb} kcal</span><span>Sport +{budgetHistorique?.kcal_sport||kcalSportDate}</span><span>Déficit −{budgetHistorique?.deficit_cible||deficit}</span><strong className="text-[#ff6b4a]">Budget {kcalObj} kcal</strong></div>}

      <div className="mt-5 grid grid-cols-3 gap-3">
        {macroRows.map(m=>{const pct=Math.min(100,Math.round(m.value/m.obj*100)); return <div key={m.label} className="rounded-xl bg-[#f9f6f3] p-3"><div className="flex justify-between items-baseline"><span className="text-[12px] font-bold" style={{color:m.color}}>{m.label}</span><span className="text-[12px] text-[#8a807a]">{hasMeals?`${m.value} / ${m.obj} g`:`— / ${m.obj} g`}</span></div><div className="h-2 bg-[#ebe5df] rounded-full mt-2 overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${hasMeals?pct:0}%`,background:m.color}}/></div></div>})}
      </div>

      <div className="mt-5 pt-5 border-t border-[#f3eee9] grid grid-cols-4 gap-2">
        {types.map(t=>{const rs=repasJour.filter(r=>r.type===t.value); const kcal=rs.reduce((s,r)=>s+(r.kcal||0),0); return <button key={t.value} onClick={()=>ouvrirLogger(t.value)} className="rounded-xl p-3 text-left transition hover:-translate-y-[1px]" style={{background:rs.length?t.bg:'#f9f6f3'}}><div className="flex items-center justify-between"><span className="text-[12px] font-bold" style={{color:rs.length?t.text:'#8a807a'}}>{t.label}</span><span className="text-sm">{t.emoji}</span></div><div className="text-[11px] mt-1" style={{color:rs.length?t.text:'#b0a8a2'}}>{rs.length?`${kcal} kcal`:'+ ajouter'}</div></button>})}
      </div>

      {!hasMeals && isToday && <div className="mt-4 rounded-xl bg-[#eef6ff] px-4 py-3 text-[12px] font-semibold text-[#185fa5]">Aucun repas enregistré aujourd'hui. Ajoute ton premier repas pour commencer le suivi — Health Engine ne considère pas cette absence comme 0 kcal consommée.</div>}
    </div>

    <div className="rounded-[26px] bg-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="flex justify-between items-center px-7 py-5"><div className="text-[17px] font-extrabold text-[#2a1a12]">Repas du jour</div><span className="text-xs font-bold bg-[#fff3ea] text-[#c2876b] px-3 py-1.5 rounded-full">{repasJour.length} repas</span></div>
      {!hasMeals?<div className="px-7 pb-6 text-sm text-[#b0a8a2]">Ton historique apparaîtra ici dès le premier repas.</div>:repasJour.map((r,i)=>{const t=typeMap[r.type]||{label:r.type,bg:'#f3eee9',text:'#8a807a'}; return <div key={r.id} className={`flex items-center gap-3 px-7 py-3.5 ${i<repasJour.length-1?'border-t border-[#f6f1ec]':''}`}><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:t.bg,color:t.text}}>{t.label}</span><div className="flex-1 min-w-0"><div className="text-sm font-bold text-[#2a1a12] truncate">{r.nom}</div><div className="text-xs text-[#b0a8a2]">P {Math.round(r.proteines||0)} · G {Math.round(r.glucides||0)} · L {Math.round(r.lipides||0)} g</div></div><strong className="text-sm">{r.kcal} kcal</strong><button onClick={()=>supprimerRepas(r.id)} className="text-[#d8cfc8] hover:text-[#e2553f]">✕</button></div>})}
    </div>

    {showLogger && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5" onClick={()=>{setShowLogger(false);resetForm()}}><div className="bg-white rounded-[26px] shadow-2xl w-full max-w-[560px] max-h-[88vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between items-center px-7 py-5 border-b border-[#f3eee9]"><div><div className="text-[18px] font-extrabold">Ajouter un repas</div><div className="text-xs text-[#8a807a] mt-1">L'IA ne se lance que si tu lui demandes une estimation.</div></div><button onClick={()=>{setShowLogger(false);resetForm()}} className="text-xl text-[#b0a8a2]">✕</button></div>
      <div className="p-7">
        <div className="flex gap-2 flex-wrap mb-5">{types.map(t=><button key={t.value} onClick={()=>setTypeRepas(t.value)} className="px-3 py-2 rounded-full text-xs font-bold" style={typeRepas===t.value?{background:t.bg,color:t.text}:{background:'#f9f6f3',color:'#8a807a'}}>{t.label}</button>)}</div>
        {!modeLogger && <div className="grid grid-cols-2 gap-3"><button onClick={()=>setModeLogger('ia')} className="rounded-2xl bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white p-5 text-left"><div className="text-lg mb-3">✦</div><div className="font-extrabold">Estimer avec l'IA</div><div className="text-xs text-white/65 mt-1">Décris simplement ce que tu as mangé.</div></button><button onClick={()=>setModeLogger('manuel')} className="rounded-2xl bg-[#f9f6f3] p-5 text-left"><div className="text-lg mb-3">✎</div><div className="font-extrabold text-[#2a1a12]">Saisir manuellement</div><div className="text-xs text-[#8a807a] mt-1">Calories et macros exactes.</div></button></div>}
        {modeLogger==='ia' && <div><textarea autoFocus rows={4} value={descriptionIA} onChange={e=>setDescriptionIA(e.target.value)} placeholder="Ex : 150 g de poulet, 200 g de pommes de terre rôties, courgette et 1 c. à café d'huile d'olive" className="w-full border border-[#f3eee9] rounded-xl p-3 text-sm resize-none"/><button disabled={!descriptionIA.trim()||loadingIA} onClick={estimerIA} className="w-full mt-3 bg-[#2a1a12] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-40">{loadingIA?'Estimation en cours…':'Estimer ce repas ✨'}</button></div>}
        {modeLogger==='manuel' && <div><input autoFocus value={nomAliment} onChange={e=>setNomAliment(e.target.value)} placeholder="Nom du repas" className="w-full border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm mb-3"/>{noteIA&&<div className="text-xs text-[#185fa5] bg-[#eef6ff] rounded-xl p-3 mb-3">{noteIA}</div>}<div className="grid grid-cols-2 gap-3">{[['Calories',kcalSaisie,setKcalSaisie],['Protéines (g)',protSaisie,setProtSaisie],['Glucides (g)',glucSaisie,setGlucSaisie],['Lipides (g)',lipSaisie,setLipSaisie]].map(([l,v,s])=><label key={l} className="text-xs font-bold text-[#8a807a]">{l}<input type="number" min="0" value={v} onChange={e=>s(e.target.value)} className="mt-1 w-full border border-[#f3eee9] rounded-xl px-3.5 py-2.5 text-sm text-[#2a1a12]"/></label>)}</div><div className="flex gap-2 mt-5"><button onClick={()=>setModeLogger(null)} className="px-4 py-3 rounded-xl bg-[#f9f6f3] text-sm font-bold">Retour</button><button disabled={loadingAjout||!nomAliment.trim()} onClick={ajouterRepas} className="flex-1 bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-40">{loadingAjout?'Ajout…':'Ajouter au journal'}</button></div></div>}
      </div>
    </div></div>}
  </div>
}
