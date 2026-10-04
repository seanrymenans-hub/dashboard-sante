'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Hydratation({ poids }) {
  const [ml, setMl] = useState(0)
  const [quantiteManuelle, setQuantiteManuelle] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfettis, setShowConfettis] = useState(false)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const poidsKg = poids?.[0]?.valeur || 82
  const objectifMl = Math.round(poidsKg * 35)
  const progression = Math.min(100, Math.round(ml / objectifMl * 100))
  const litresBus = (ml / 1000).toFixed(1)
  const litresObjectif = (objectifMl / 1000).toFixed(1)
  const objectifAtteint = progression >= 100

  // Déclenche les confettis seulement au moment où on FRANCHIT 100%,
  // pas à chaque re-render une fois l'objectif déjà atteint.
  useEffect(() => {
    if (objectifAtteint) {
      setShowConfettis(true)
      const t = setTimeout(() => setShowConfettis(false), 2200)
      return () => clearTimeout(t)
    }
  }, [objectifAtteint])

  const boutons = [
    { label: '☕', sublabel: 'Expresso', ml: 150, taille: 'sm' },
    { label: '🥛', sublabel: 'Verre', ml: 250, taille: 'sm' },
    { label: '🥤', sublabel: 'Canette', ml: 330, taille: 'md' },
    { label: '💧', sublabel: 'Bouteille', ml: 500, taille: 'md' },
    { label: '🫙', sublabel: 'Grande', ml: 1000, taille: 'lg' },
  ]

  useEffect(() => { fetchHydratation() }, [])

  async function fetchHydratation() {
    const { data } = await supabase.from('hydratation').select('*').eq('date', today).maybeSingle()
    if (data) setMl(data.verres)
  }

  async function ajouter(quantite) {
    setLoading(true)
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
    if (progression === 0) return "Commence ta journée avec un grand verre d'eau"
    if (progression < 25) return 'Bon début, continue !'
    if (progression < 50) return 'Tu es sur la bonne voie'
    if (progression < 75) return 'Plus que la moitié !'
    if (progression < 100) return 'Encore un petit effort'
    return 'Objectif du jour atteint'
  }

  const couleurActive = objectifAtteint ? '#16c79a' : '#378ADD'
  const couleurActiveDark = objectifAtteint ? '#13a884' : '#2872c4'

  const tailleClasses = {
    sm: 'py-3',
    md: 'py-3.5',
    lg: 'py-4',
  }

  const confettisCouleurs = ['#fff', '#ffe066', '#ff9a8b', '#9fe1cb', '#ffd6e8']

  return (
    <div
      className={`relative overflow-hidden rounded-[26px] p-[30px_32px] transition-all ${objectifAtteint ? 'bg-gradient-to-br from-[#16c79a] to-[#13a884] text-white' : 'bg-white'}`}
      style={!objectifAtteint ? { boxShadow: '0 12px 28px -18px rgba(0,0,0,0.12)' } : { boxShadow: '0 20px 40px -18px rgba(22,199,154,0.5)' }}
    >
      {showConfettis && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {Array.from({ length: 28 }).map((_, i) => {
            const left = Math.random() * 100
            const delay = Math.random() * 0.4
            const duration = 1.4 + Math.random() * 0.9
            const size = 6 + Math.random() * 7
            const color = confettisCouleurs[i % confettisCouleurs.length]
            const rotate = Math.random() * 360
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '-5%',
                  width: size,
                  height: size * 0.4,
                  background: color,
                  borderRadius: 2,
                  transform: `rotate(${rotate}deg)`,
                  animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
                  opacity: 0,
                }}
              />
            )
          })}
          <style>{`
            @keyframes confetti-fall {
              0% { opacity: 1; transform: translateY(0) rotate(0deg); }
              100% { opacity: 0; transform: translateY(420px) rotate(420deg); }
            }
          `}</style>
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div>
          <div className={`text-[13px] font-bold tracking-wide uppercase ${objectifAtteint ? 'text-white/85' : 'text-[#c2876b]'}`}>Hydratation</div>
          <h2 className={`mt-1 text-[22px] font-extrabold ${objectifAtteint ? 'text-white' : 'text-[#2a1a12]'}`}>
            {objectifAtteint ? '🎉 ' : ''}{getMessage()}
          </h2>
        </div>
        <button
          onClick={reset}
          className={`text-xs font-semibold transition-colors flex-shrink-0 ${objectifAtteint ? 'text-white/60 hover:text-white' : 'text-[#d8cfc8] hover:text-[#e2553f]'}`}
        >
          Reset
        </button>
      </div>

      {/* Bouteille héros + stats */}
      <div className="flex items-center gap-10 my-8">
        {/* Bouteille grande */}
        <div className="relative flex-shrink-0" style={{ width: 96, height: 168 }}>
          <svg width="96" height="168" viewBox="0 0 96 168">
            <rect
              x="14" y="34" width="68" height="122" rx="16"
              fill="none"
              stroke={objectifAtteint ? 'rgba(255,255,255,0.35)' : '#f0ebe5'}
              strokeWidth="3"
            />
            <rect
              x="34" y="16" width="28" height="20" rx="5"
              fill={objectifAtteint ? 'rgba(255,255,255,0.35)' : '#f0ebe5'}
            />
            <clipPath id="bottle-clip-lg">
              <rect x="14" y="34" width="68" height="122" rx="16" />
            </clipPath>
            <g clipPath="url(#bottle-clip-lg)">
              <rect
                x="14"
                y={34 + 122 * (1 - progression / 100)}
                width="68"
                height={122 * progression / 100}
                fill={objectifAtteint ? 'rgba(255,255,255,0.9)' : couleurActive}
                style={{ transition: 'all 0.6s ease' }}
              />
              {progression > 0 && (
                <path
                  d={`M14,${34 + 122 * (1 - progression / 100)} Q 30,${34 + 122 * (1 - progression / 100) - 4} 48,${34 + 122 * (1 - progression / 100)} T 82,${34 + 122 * (1 - progression / 100)} V ${34 + 122} H 14 Z`}
                  fill={objectifAtteint ? 'white' : couleurActiveDark}
                  opacity="0.5"
                  style={{ transition: 'all 0.6s ease' }}
                />
              )}
            </g>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pt-6">
            <span className={`text-2xl font-extrabold ${progression > 55 ? (objectifAtteint ? 'text-[#13a884]' : 'text-white') : (objectifAtteint ? 'text-white' : 'text-[#8a807a]')}`}>
              {progression}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1">
          <div className="mb-4">
            <span className={`text-[44px] font-extrabold leading-none ${objectifAtteint ? 'text-white' : 'text-[#2a1a12]'}`}>{litresBus}</span>
            <span className={`text-base ml-1.5 ${objectifAtteint ? 'text-white/80' : 'text-[#b0a8a2]'}`}>L</span>
            <div className={`text-sm mt-1.5 ${objectifAtteint ? 'text-white/80' : 'text-[#8a807a]'}`}>sur {litresObjectif}L objectif</div>
          </div>
          <div className={`relative h-3 rounded-full overflow-visible ${objectifAtteint ? 'bg-white/25' : 'bg-[#f3eee9]'}`}>
            <div
              className="h-full rounded-full transition-all duration-500 overflow-hidden"
              style={{ width: `${progression}%`, background: objectifAtteint ? 'white' : couleurActive }}
            />
            {[25, 50, 75].map(jalon => {
              const franchi = progression >= jalon
              return (
                <div
                  key={jalon}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all"
                  style={{
                    left: `${jalon}%`,
                    background: franchi ? (objectifAtteint ? 'white' : couleurActive) : (objectifAtteint ? 'rgba(255,255,255,0.3)' : '#fff'),
                    borderColor: franchi ? (objectifAtteint ? 'white' : couleurActive) : (objectifAtteint ? 'rgba(255,255,255,0.5)' : '#d8cfc8'),
                  }}
                />
              )
            })}
          </div>
          <div className={`flex justify-between text-xs mt-1.5 font-medium ${objectifAtteint ? 'text-white/60' : 'text-[#d8cfc8]'}`}>
            <span>0L</span>
            <span>{litresObjectif}L</span>
          </div>
        </div>
      </div>

      {/* Boutons rapides */}
      <div className="flex gap-2.5 mb-5">
        {boutons.map(b => (
          <button
            key={b.ml}
            onClick={() => ajouter(b.ml)}
            disabled={loading}
            className={`flex-1 flex flex-col items-center gap-1 ${tailleClasses[b.taille]} rounded-2xl transition-all disabled:opacity-40 ${
              objectifAtteint
                ? 'bg-white/15 hover:bg-white/25'
                : 'bg-[#dceeff] hover:bg-[#cce5ff]'
            }`}
          >
            <span className="text-xl">{b.label}</span>
            <span className={`text-xs font-semibold ${objectifAtteint ? 'text-white/90' : 'text-[#185fa5]'}`}>{b.sublabel}</span>
            <span className={`text-xs font-bold ${objectifAtteint ? 'text-white' : 'text-[#378ADD]'}`}>+{b.ml}ml</span>
          </button>
        ))}
      </div>

      {/* Saisie manuelle */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Quantité personnalisée (ml)"
          value={quantiteManuelle}
          onChange={e => setQuantiteManuelle(e.target.value)}
          className={`flex-1 rounded-xl px-4 py-3 text-sm ${objectifAtteint ? 'bg-white/15 placeholder-white/50 text-white border-none' : 'border border-[#f3eee9]'}`}
        />
        <button
          onClick={() => quantiteManuelle && ajouter(Number(quantiteManuelle))}
          disabled={!quantiteManuelle || loading}
          className={`rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-40 transition-all ${
            objectifAtteint
              ? 'bg-white text-[#13a884]'
              : 'bg-gradient-to-br from-[#378ADD] to-[#2872c4] text-white'
          }`}
        >
          + Ajouter
        </button>
      </div>
    </div>
  )
}