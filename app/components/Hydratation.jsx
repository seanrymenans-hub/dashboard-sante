'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Hydratation({ poids }) {
  const [ml, setMl] = useState(0)
  const [quantiteManuelle, setQuantiteManuelle] = useState('')
  const [loading, setLoading] = useState(false)
  const [animate, setAnimate] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const poidsKg = poids?.[0]?.valeur || 82
  const objectifMl = Math.round(poidsKg * 35)
  const progression = Math.min(100, Math.round(ml / objectifMl * 100))
  const litresBus = (ml / 1000).toFixed(1)
  const litresObjectif = (objectifMl / 1000).toFixed(1)

  const boutons = [
    { label: '☕', sublabel: 'Expresso', ml: 150 },
    { label: '🥛', sublabel: 'Verre', ml: 250 },
    { label: '🥤', sublabel: 'Canette', ml: 330 },
    { label: '💧', sublabel: 'Bouteille', ml: 500 },
    { label: '🫙', sublabel: 'Grande', ml: 1000 },
  ]

  useEffect(() => { fetchHydratation() }, [])

  async function fetchHydratation() {
    const { data } = await supabase.from('hydratation').select('*').eq('date', today).single()
    if (data) setMl(data.verres)
  }

  async function ajouter(quantite) {
    setLoading(true)
    setAnimate(true)
    setTimeout(() => setAnimate(false), 600)
    const newMl = ml + quantite
    await supabase.from('hydratation').upsert(
      { date: today, verres: newMl },
      { onConflict: 'date' }
    )
    setMl(newMl)
    setQuantiteManuelle('')
    setLoading(false)
  }

  async function reset() {
    await supabase.from('hydratation').upsert({ date: today, verres: 0 }, { onConflict: 'date' })
    setMl(0)
  }

  const getMessage = () => {
    if (progression === 0) return 'Commence ta journée avec un grand verre d\'eau 💧'
    if (progression < 25) return 'Bon début, continue comme ça !'
    if (progression < 50) return 'Tu es sur la bonne voie 👍'
    if (progression < 75) return 'Plus que la moitié, tu y es presque !'
    if (progression < 100) return 'Encore un peu et c\'est dans la poche 💪'
    return '🎉 Objectif atteint ! Excellent travail !'
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1f35 100%)',
      borderRadius: '20px',
      padding: '28px',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Bulles décoratives */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          borderRadius: '50%',
          background: 'rgba(56, 189, 248, 0.06)',
          width: `${[60, 40, 80, 30, 50, 70][i]}px`,
          height: `${[60, 40, 80, 30, 50, 70][i]}px`,
          top: `${[10, 60, 20, 70, 40, 5][i]}%`,
          left: `${[80, 90, 70, 85, 95, 75][i]}%`,
          animation: `float${i} ${[4, 6, 5, 7, 4.5, 6.5][i]}s ease-in-out infinite`,
        }} />
      ))}

      <style>{`
        @keyframes wave1 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25px) translateY(-5px); }
        }
        @keyframes wave2 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(25px) translateY(-8px); }
        }
        @keyframes fillUp {
          0% { transform: scaleY(1); }
          50% { transform: scaleY(1.03); }
          100% { transform: scaleY(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            Hydratation
          </div>
          <div style={{ color: 'white', fontSize: '13px', opacity: 0.7 }}>{getMessage()}</div>
        </div>
        <button onClick={reset} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}>
          Reset
        </button>
      </div>

      {/* Bouteille + chiffres */}
      <div style={{ display: 'flex', gap: '28px', alignItems: 'center', marginBottom: '28px' }}>

        {/* Bouteille animée */}
        <div style={{ position: 'relative', width: '80px', height: '120px', flexShrink: 0 }}>
          {/* Contour bouteille */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '2px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px 12px 16px 16px',
            overflow: 'hidden',
          }}>
            {/* Eau qui monte */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${progression}%`,
              background: 'linear-gradient(180deg, rgba(56,189,248,0.6) 0%, rgba(14,116,144,0.8) 100%)',
              transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: animate ? 'fillUp 0.6s ease' : 'none',
            }}>
              {/* Vague 1 */}
              <div style={{
                position: 'absolute',
                top: '-8px', left: '-20px', right: '-20px',
                height: '16px',
                background: 'rgba(56, 189, 248, 0.5)',
                borderRadius: '50%',
                animation: 'wave1 3s ease-in-out infinite',
              }} />
              {/* Vague 2 */}
              <div style={{
                position: 'absolute',
                top: '-6px', left: '-20px', right: '-20px',
                height: '12px',
                background: 'rgba(56, 189, 248, 0.3)',
                borderRadius: '50%',
                animation: 'wave2 4s ease-in-out infinite',
              }} />
            </div>
          </div>
          {/* Bouchon */}
          <div style={{
            position: 'absolute',
            top: '-10px', left: '50%', transform: 'translateX(-50%)',
            width: '30px', height: '12px',
            background: 'rgba(56, 189, 248, 0.3)',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '4px 4px 0 0',
          }} />
          {/* % au centre */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: progression > 50 ? 'white' : 'rgba(56,189,248,0.9)',
            fontSize: '14px', fontWeight: '700',
            textShadow: progression > 50 ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            transition: 'color 0.5s',
          }}>
            {progression}%
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ color: 'white', fontSize: '42px', fontWeight: '700', lineHeight: 1 }}>
              {litresBus}
            </span>
            <span style={{ color: 'rgba(56,189,248,0.7)', fontSize: '16px', marginLeft: '4px' }}>L</span>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>
              sur {litresObjectif}L objectif
            </div>
          </div>

          {/* Barre progression */}
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progression}%`,
              background: progression >= 100
                ? 'linear-gradient(90deg, #22d3ee, #34d399)'
                : 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
              borderRadius: '99px',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 10px rgba(56,189,248,0.5)',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>0L</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{litresObjectif}L</span>
          </div>
        </div>
      </div>

      {/* Boutons rapides */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {boutons.map(b => (
          <button
            key={b.ml}
            onClick={() => ajouter(b.ml)}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: '56px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '10px 4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.2)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{ fontSize: '18px' }}>{b.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>{b.sublabel}</span>
            <span style={{ color: '#38bdf8', fontSize: '10px', fontWeight: '600' }}>+{b.ml}ml</span>
          </button>
        ))}
      </div>

      {/* Saisie manuelle */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="number"
          placeholder="Quantité personnalisée (ml)"
          value={quantiteManuelle}
          onChange={e => setQuantiteManuelle(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: 'white',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          onClick={() => quantiteManuelle && ajouter(Number(quantiteManuelle))}
          disabled={!quantiteManuelle || loading}
          style={{
            background: 'rgba(56, 189, 248, 0.2)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '10px',
            padding: '10px 16px',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            opacity: !quantiteManuelle ? 0.4 : 1,
          }}
        >
          + Ajouter
        </button>
      </div>
    </div>
  )
}