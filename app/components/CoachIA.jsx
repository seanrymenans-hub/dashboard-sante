'use client'
import { useState } from 'react'
import { computeHealthEngine } from '../../lib/healthEngine'

export default function CoachIA({ poids, repas, seances, composition, objectifs }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)

  async function generer() {
    setLoading(true); setErreur(null)
    const { budget, progression, tendances } = computeHealthEngine({ poids, repas, seances, composition, objectifs })
    try {
      const res = await fetch('/api/coach-ia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poids, repas, seances, composition, objectifs, budget, progression, tendances })
      })
      const result = await res.json()
      if (res.ok && result.bilan) { setData(result); setGeneratedAt(new Date()) }
      else setErreur(result?.error ? `Impossible de générer le bilan (${result.error})` : 'Impossible de générer le bilan')
    } catch { setErreur('Erreur de connexion') }
    setLoading(false)
  }

  return (
    <section className="h-full rounded-[26px] bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] p-[26px_28px] text-white flex flex-col overflow-hidden relative">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-[15px] flex-none">✦</span>
          <span className="text-sm font-extrabold tracking-wide">COACH IA</span>
        </div>
        {data && <span className="text-[10px] font-bold text-white/55 border border-white/10 rounded-full px-2.5 py-1">Confiance {data.confiance || 'moyenne'}</span>}
      </div>

      {!data && !loading && (
        <div className="flex-1 relative flex flex-col justify-start">
          <p className="text-[15px] leading-relaxed opacity-90 mb-4 max-w-[440px]">Ton coach analyse poids, nutrition, activité et composition pour te donner un bilan personnalisé et nuancé.</p>
          <button onClick={generer} className="self-start border-none bg-white/[0.12] hover:bg-white/20 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl transition-all">Voir mon bilan ✨</button>
          <div className="mt-2 text-[9px] uppercase tracking-[.08em] text-white/35">0 token au chargement · uniquement sur clic</div>
          <span className="pointer-events-none select-none absolute -right-4 -bottom-10 text-[160px] leading-none opacity-[0.06]">✦</span>
        </div>
      )}

      {loading && <div className="text-[15px] opacity-80 py-2">Ton coach relie les signaux de ta semaine…</div>}
      {erreur && <div className="text-[13px] text-red-200 bg-red-400/10 rounded-xl p-3">{erreur} <button onClick={generer} className="underline ml-2">Réessayer</button></div>}

      {data && (
        <article className="coach-v1-article">
          {data.titre && <h3>{data.titre}</h3>}
          <p className="coach-v1-lead">{data.bilan}</p>
          <div className="coach-v1-grid">
            {!!data.positifs?.length && <div className="coach-v1-section"><div className="coach-v1-label">CE QUI VA BIEN</div>{data.positifs.map((p,i)=><div className="coach-v1-point" key={i}><span>✓</span><p>{p}</p></div>)}</div>}
            {!!data.attention?.length && <div className="coach-v1-section"><div className="coach-v1-label">À GARDER À L'ŒIL</div>{data.attention.map((p,i)=><div className="coach-v1-point watch" key={i}><span>!</span><p>{p}</p></div>)}</div>}
          </div>
          {data.interpretation && <div className="coach-v1-block"><div className="coach-v1-label">CE QUE J'EN DÉDUIS</div><p>{data.interpretation}</p></div>}
          {!!data.conseils?.length && <div className="mt-4"><div className="coach-v1-label">PLAN D'ACTION</div>{data.conseils.map((c,i)=><div className="coach-v1-action" key={i}><span>0{i+1}</span><div><strong>{c.titre}</strong><p>{c.detail}</p></div></div>)}</div>}
          {data.priorite && <div className="coach-v1-priority"><span>🎯 PRIORITÉ N°1</span><strong>{data.priorite}</strong></div>}
          <div className="coach-v1-meta"><span>{data.confiance_detail || ''}</span><span>{generatedAt ? `Généré à ${generatedAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}` : ''}</span><button onClick={generer}>Actualiser · utilise l'IA</button></div>
        </article>
      )}
    </section>
  )
}
