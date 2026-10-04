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
      const res = await fetch('/api/coach-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poids, repas, seances, composition, objectifs, budget, progression, tendances }) })
      const result = await res.json()
      if (res.ok && result.bilan) { setData(result); setGeneratedAt(new Date()) }
      else setErreur(result?.error ? `Impossible de générer le bilan (${result.error})` : 'Impossible de générer le bilan')
    } catch { setErreur('Erreur de connexion') }
    setLoading(false)
  }

  return (
    <section className="coach-editorial">
      <div className="coach-header">
        <div className="coach-brand"><span className="coach-spark">✦</span><div><div className="coach-label">HEALTH INTELLIGENCE</div><div className="coach-name">Coach IA</div></div></div>
        {data && <div className={`confidence ${data.confiance || 'moyenne'}`}>Confiance {data.confiance || 'moyenne'}</div>}
      </div>

      {!data && !loading && <div className="coach-empty">
        <div className="coach-empty-copy"><h3>Comprends ce que racontent vraiment tes données.</h3><p>Poids, nutrition, activité et composition sont croisés pour produire une lecture nuancée de ta semaine. Aucune analyse n'est lancée sans ton clic.</p></div>
        <button onClick={generer} className="coach-cta">✦ Interpréter mes données</button>
        <div className="coach-footnote">0 token au chargement · analyse à la demande</div>
      </div>}

      {loading && <div className="coach-loading"><span className="coach-loader">✦</span><div><strong>Je relie les signaux de ta semaine…</strong><p>Poids, nutrition, activité et qualité des données.</p></div></div>}
      {erreur && <div className="coach-error">{erreur}<button onClick={generer}>Réessayer</button></div>}

      {data && <article className="coach-article">
        <h3>{data.titre || 'Ton bilan'}</h3>
        <p className="coach-lead">{data.bilan}</p>
        <div className="coach-columns">
          {!!data.positifs?.length && <div className="coach-section"><div className="coach-section-title">Ce qui va bien</div>{data.positifs.map((p,i)=><div className="coach-point positive" key={i}><span>✓</span><p>{p}</p></div>)}</div>}
          {!!data.attention?.length && <div className="coach-section"><div className="coach-section-title">À garder à l'œil</div>{data.attention.map((p,i)=><div className="coach-point watch" key={i}><span>!</span><p>{p}</p></div>)}</div>}
        </div>
        {data.interpretation && <div className="coach-interpret"><div className="coach-section-title">Ce que j'en déduis</div><p>{data.interpretation}</p></div>}
        {!!data.conseils?.length && <div className="coach-actions"><div className="coach-section-title">Plan d'action</div><div className="coach-action-grid">{data.conseils.map((c,i)=><div className="coach-action" key={i}><span>0{i+1}</span><div><strong>{c.titre}</strong><p>{c.detail}</p></div></div>)}</div></div>}
        {data.priorite && <div className="coach-priority"><span>🎯 Priorité n°1</span><strong>{data.priorite}</strong></div>}
        <div className="coach-meta"><span>{data.confiance_detail}</span><span>{generatedAt ? `Généré à ${generatedAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}` : ''}</span><button onClick={generer}>Actualiser · utilise l'IA</button></div>
      </article>}
    </section>
  )
}
