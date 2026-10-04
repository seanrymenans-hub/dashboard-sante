import { dateKey, daysAgo } from './dateUtils'
import { computeWeightTrend } from './healthEngine'

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null }
function round(v, digits = 1) { if (!Number.isFinite(v)) return null; const p=10**digits; return Math.round(v*p)/p }
function entriesWithin(arr = [], days = 7) { return arr.filter(x => { const age=daysAgo(x?.date); return age>=0 && age<days }) }
function uniqueDays(arr = [], days = 7) { return [...new Set(entriesWithin(arr, days).map(x=>x?.date).filter(Boolean))] }
function sortedDesc(arr=[]) { return [...arr].sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))) }

function nearestOlder(entries = [], days = 30, field = 'valeur') {
  const sorted=sortedDesc(entries); const latest=sorted[0]
  if (!latest?.date) return null
  let best=null, bestDiff=Infinity
  for (const item of sorted.slice(1)) {
    const value=num(item?.[field]); if (value===null) continue
    const age=daysAgo(item.date, latest.date)
    const diff=Math.abs(age-days)
    if(diff<bestDiff){best=item;bestDiff=diff}
  }
  return bestDiff <= Math.max(4, days*.4) ? best : null
}
function compositionDelta(composition=[],days=30,field){ const sorted=sortedDesc(composition); const latest=sorted[0], older=nearestOlder(sorted,days,field); const a=num(latest?.[field]),b=num(older?.[field]); return a===null||b===null?null:round(a-b,1) }

function sportSummary(seances=[],days=7){
  const current=entriesWithin(seances,days)
  const previous=seances.filter(s=>{const age=daysAgo(s?.date);return age>=days&&age<days*2})
  const totalMinutes=current.reduce((s,x)=>s+(num(x?.duree)||0),0)
  const totalKcal=current.reduce((s,x)=>s+(num(x?.kcal)||0),0)
  const runs=current.filter(x=>String(x?.type).toLowerCase()==='course')
  const strength=current.filter(x=>['renfo','renforcement','musculation','strength'].includes(String(x?.type||'').toLowerCase()))
  const other=current.length-runs.length-strength.length
  const runKm=runs.reduce((s,x)=>s+(num(x?.distance)||0),0)
  const prevMinutes=previous.reduce((s,x)=>s+(num(x?.duree)||0),0)
  return { sessions:current.length,totalMinutes,totalKcal,runs:runs.length,strength:strength.length,other,runKm:round(runKm,1),volumeChange:prevMinutes>0?Math.round(((totalMinutes-prevMinutes)/prevMinutes)*100):null }
}
function nutritionSummary(repas=[],tendances={},days=7){
  const tracked=uniqueDays(repas,days); const meals=entriesWithin(repas,days)
  const avg=(field)=>tracked.length?Math.round(meals.reduce((s,x)=>s+(num(x?.[field])||0),0)/tracked.length):null
  const pct=days===7?tendances?.pctRespect7j:days===30?tendances?.pctRespect30j:null
  return {trackedDays:tracked.length,avgProtein:avg('proteines'),avgKcal:avg('kcal'),pctRespect:tracked.length?pct:null}
}
function stepsSummary(pas=[],days=7){
  const rows=entriesWithin(pas,days).filter(x=>num(x?.nb_pas)!==null)
  const today=dateKey(); const todayRow=pas.find(x=>x?.date===today)
  return {trackedDays:rows.length,average:rows.length?Math.round(rows.reduce((s,x)=>s+Number(x.nb_pas||0),0)/rows.length):null,today:num(todayRow?.nb_pas),lastDate:sortedDesc(rows)[0]?.date||null}
}
function quality(status,label,detail,source='Health Engine',freshness=null){return{status,label,detail,source,freshness}}

export function buildCoachContext(raw={},horizon='7d'){
  const {poids=[],repas=[],seances=[],composition=[],objectifs={},pas=[],hydratation=[],budget={},progression={},tendances={},macros={}}=raw
  const today=dateKey(); const mealsToday=repas.filter(x=>x?.date===today); const sessionsToday=seances.filter(x=>x?.date===today)
  const nutrition7=nutritionSummary(repas,tendances,7), nutrition30=nutritionSummary(repas,tendances,30)
  const sport7=sportSummary(seances,7), sport30=sportSummary(seances,30), steps7=stepsSummary(pas,7)
  const w14=computeWeightTrend(poids,14,today), w30=computeWeightTrend(poids,30,today)
  const latestWeight=sortedDesc(poids)[0]||null, latestComp=sortedDesc(composition)[0]||null
  const fat30=compositionDelta(composition,30,'masse_grasse'), muscle30=compositionDelta(composition,30,'masse_musculaire')
  const latestWeightAge=latestWeight?.date?daysAgo(latestWeight.date,today):Infinity
  const latestCompAge=latestComp?.date?daysAgo(latestComp.date,today):Infinity

  const dataQuality={
    weight: w30.confidence==='élevée'||w14.confidence==='élevée'?quality('good_data','Poids',`${w30.samples||w14.samples} mesures utiles à la tendance`,'Withings',latestWeightAge<=1?'aujourd’hui':`${Math.round(latestWeightAge)}j`):w14.confidence==='moyenne'||w30.confidence==='moyenne'?quality('partial_data','Poids','Tendance exploitable mais encore modérée','Withings',`${Math.round(latestWeightAge)}j`):quality('insufficient_data','Poids',poids.length?`${poids.length} mesure(s), tendance encore fragile`:'Aucune mesure','Withings',null),
    nutrition:nutrition7.trackedDays>=5?quality('good_data','Nutrition',`${nutrition7.trackedDays}/7 jours suivis`,'Journal Health Engine','7j'):nutrition7.trackedDays>=2?quality('partial_data','Nutrition',`${nutrition7.trackedDays}/7 jours suivis`,'Journal Health Engine','7j'):quality('insufficient_data','Nutrition',nutrition7.trackedDays?`${nutrition7.trackedDays}/7 jour suivi`:'Aucun jour suivi','Journal Health Engine','7j'),
    activity:sport7.sessions>=2||steps7.trackedDays>=4?quality('good_data','Activité',`${sport7.sessions} séances · ${steps7.trackedDays}/7 jours de pas`,'Withings + Sport','7j'):(sport7.sessions||steps7.trackedDays)?quality('partial_data','Activité',`${sport7.sessions} séance(s) · ${steps7.trackedDays}/7 jours de pas`,'Withings + Sport','7j'):quality('insufficient_data','Activité','Peu ou pas de données récentes','Withings + Sport','7j'),
    composition:composition.length>=3&&latestCompAge<=14?quality('good_data','Composition',`${composition.length} mesures disponibles`,'Withings BIA',`${Math.round(latestCompAge)}j`):composition.length?quality('partial_data','Composition',`${composition.length} mesure(s) disponible(s)`,'Withings BIA',Number.isFinite(latestCompAge)?`${Math.round(latestCompAge)}j`:null):quality('not_available','Composition','Aucune mesure disponible','Withings BIA',null),
  }

  return {
    horizon, generatedAt:new Date().toISOString(),
    profile:{weightCurrent:num(latestWeight?.valeur),weightTarget:num(objectifs?.poids_objectif)??70,weightStart:num(objectifs?.poids_depart),lostKg:num(progression?.kgPerdus),remainingKg:num(progression?.kgRestants),progressionPct:num(progression?.progressionPct),bmr:num(objectifs?.tmb),targetDeficit:num(objectifs?.deficit_cible)},
    today:{caloriesLogged:mealsToday.length?mealsToday.reduce((s,x)=>s+(num(x?.kcal)||0),0):null,mealsLogged:mealsToday.length,budget:num(budget?.budgetJour),budgetProvisional:Boolean(budget?.budgetProvisoire),proteinTarget:num(macros?.proteines),steps:steps7.today,sessions:sessionsToday.map(x=>({type:x?.type,name:x?.nom,duration:num(x?.duree),kcal:num(x?.kcal)})),hydrationLiters:(()=>{const row=hydratation.find(x=>x?.date===today);const ml=num(row?.verres);return ml===null?null:round(ml/1000,1)})()},
    weight:{trend14d:w14.kgPerWeek,trend30d:w30.kgPerWeek,confidence30d:w30.confidence,confidence14d:w14.confidence,count:poids.length,lastDate:latestWeight?.date||null},
    nutrition:{d7:nutrition7,d30:nutrition30}, activity:{d7:sport7,d30:sport30,steps7},
    composition:{current:latestComp?{fatKg:num(latestComp?.masse_grasse),fatPct:num(latestComp?.masse_grasse_pct),muscleKg:num(latestComp?.masse_musculaire),waterKg:num(latestComp?.masse_hydrique)}:null,fatDelta30d:fat30,muscleDelta30d:muscle30,count:composition.length,lastDate:latestComp?.date||null},
    dataQuality,
  }
}

export function computeCoachInsights(ctx){
  const insights=[]; const add=(domain,title,detail,tone='neutral',question)=>insights.push({domain,title,detail,tone,question})
  const trend=ctx.weight.trend30d??ctx.weight.trend14d
  const conf=ctx.weight.trend30d!==null?ctx.weight.confidence30d:ctx.weight.confidence14d
  if(trend!==null&&conf!=='insuffisante') add('Poids',trend<-.05?`Tendance de ${Math.abs(trend).toFixed(2)} kg/semaine à la baisse`:trend>.05?`Tendance de ${trend.toFixed(2)} kg/semaine à la hausse`:'Poids globalement stable',`Régression sur les mesures datées · confiance ${conf}.`,trend<-.05?'positive':trend>.05?'watch':'neutral','Que signifie ma tendance de poids actuelle ?')
  else add('Poids','Tendance encore fragile','Pas assez de mesures réparties dans le temps pour estimer un rythme fiable.','neutral','Est-ce que j’ai assez de données de poids pour conclure ?')

  if(ctx.nutrition.d7.trackedDays<3) add('Nutrition','Nutrition peu documentée',`${ctx.nutrition.d7.trackedDays}/7 jour(s) suivi(s) : insuffisant pour relier alimentation et poids.`,'neutral','Quelles conclusions peux-tu vraiment tirer de ma nutrition ?')
  else if(ctx.nutrition.d7.avgProtein!==null&&ctx.today.proteinTarget){const ratio=ctx.nutrition.d7.avgProtein/ctx.today.proteinTarget;add('Nutrition',ratio>=.9?'Protéines proches de la cible':'Protéines à renforcer',`${ctx.nutrition.d7.avgProtein} g/j en moyenne sur les jours suivis pour une cible d’environ ${ctx.today.proteinTarget} g.`,ratio>=.9?'positive':'watch','Est-ce que mon apport en protéines est adapté ?')}

  if(ctx.activity.d7.sessions===0) add('Sport','Aucune séance récente enregistrée','Cela décrit le suivi disponible, pas nécessairement ton activité réelle.','neutral','Que peux-tu conclure de ma semaine sportive avec les données actuelles ?')
  else {const {sessions,totalMinutes,runs,strength,volumeChange}=ctx.activity.d7;let detail=`${sessions} séance(s), ${totalMinutes} min · ${runs} course(s) · ${strength} renfo.`;if(volumeChange!==null)detail+=` Volume ${volumeChange>0?'+':''}${volumeChange}% vs semaine précédente.`;add('Sport',strength===0&&runs>0?'Semaine très orientée cardio':'Charge sportive documentée',detail,strength===0&&runs>0?'watch':'positive','Comment juges-tu l’équilibre de ma semaine sportive ?')}

  if(ctx.today.budgetProvisional) add('Données','Budget du jour provisoire','Les pas du jour ne sont pas encore disponibles : le budget pourra évoluer après la synchronisation Withings.','neutral','Quel impact les pas manquants ont-ils sur mon budget du jour ?')
  else if(ctx.composition.current&&(ctx.composition.fatDelta30d!==null||ctx.composition.muscleDelta30d!==null)){const parts=[];if(ctx.composition.fatDelta30d!==null)parts.push(`masse grasse ${ctx.composition.fatDelta30d>0?'+':''}${ctx.composition.fatDelta30d.toFixed(1)} kg`);if(ctx.composition.muscleDelta30d!==null)parts.push(`masse musculaire ${ctx.composition.muscleDelta30d>0?'+':''}${ctx.composition.muscleDelta30d.toFixed(1)} kg`);add('Composition','Composition à lire en tendance',`${parts.join(' · ')} sur ~30 jours. L'impédancemétrie reste sensible à l'hydratation.`,'neutral','Comment interpréter ma composition corporelle sans sur-réagir ?')}
  return insights.slice(0,4)
}

export function computeSuggestedQuestions(ctx,insights=computeCoachInsights(ctx)){
  const q=insights.map(x=>x.question).filter(Boolean)
  if(ctx.today.mealsLogged===0)q.push('Que devrais-je prioriser aujourd’hui avec les données disponibles ?')
  if(ctx.activity.d7.sessions>0)q.push('Est-ce que ma charge actuelle est cohérente avec mon objectif ?')
  q.push('Quel est le signal le plus important à surveiller cette semaine ?')
  return [...new Set(q)].slice(0,4)
}
