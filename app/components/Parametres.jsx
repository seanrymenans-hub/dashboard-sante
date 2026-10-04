'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import RecalculerBudget from './RecalculerBudget'
import RecalculerJour from './RecalculerJour'
import ExportDonnees from './ExportDonnees'
import WithingsSync from './WithingsSync'

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#b08f7c] mb-1">{eyebrow}</div>
      <div className="text-sm font-bold text-[#2a1a12]">{title}</div>
      {description && <div className="text-xs text-[#8a807a] mt-1 leading-relaxed">{description}</div>}
    </div>
  )
}

export default function Parametres({ onClose, onSave, poids, composition, repas, seances, pas, dailyBudgets, objectifs: objectifsProps }) {
  const [poidsCible, setPoidsObj] = useState(70)
  const [poidsDepart, setPoidsDepart] = useState(83.2)
  const [age, setAge] = useState(25)
  const [taille, setTaille] = useState(175)
  const [sexe, setSexe] = useState('homme')
  const [kcalObj, setKcalObj] = useState(1875)
  const [proteines, setProteines] = useState(150)
  const [glucides, setGlucides] = useState(180)
  const [lipides, setLipides] = useState(55)
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)

  const poidsActuel = poids?.[0]?.valeur || poidsDepart || 83
  const proteinesDyn = Math.round(poidsActuel * 2)

  useEffect(() => {
    async function fetchObjectifs() {
      const { data } = await supabase.from('objectifs').select('*').limit(1).single()
      if (data) {
        setPoidsObj(data.poids_objectif)
        setPoidsDepart(data.poids_depart)
        setAge(data.age || 25)
        setTaille(data.taille || 175)
        setSexe(data.sexe || 'homme')
        setKcalObj(data.kcal_journalier)
        setProteines(data.proteines_objectif || 150)
        setGlucides(data.glucides_objectif || 180)
        setLipides(data.lipides_objectif || 55)
      }
    }
    fetchObjectifs()
  }, [])

  async function sauvegarder() {
    setLoading(true)
    const tmb = sexe === 'homme'
      ? Math.round(88.36 + (13.4 * poidsDepart) + (4.8 * taille) - (5.7 * age))
      : Math.round(447.6 + (9.2 * poidsDepart) + (3.1 * taille) - (4.3 * age))

    const { data: existing } = await supabase.from('objectifs').select('id').limit(1).single()
    const payload = {
      poids_objectif: poidsCible,
      poids_depart: poidsDepart,
      kcal_journalier: kcalObj,
      proteines_objectif: proteines,
      glucides_objectif: glucides,
      lipides_objectif: lipides,
      age, taille, sexe, tmb
    }
    if (existing) {
      await supabase.from('objectifs').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('objectifs').insert(payload)
    }
    setLoading(false)
    setSucces(true)
    setTimeout(() => {
      setSucces(false)
      onSave?.()
      onClose()
    }, 900)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(35,22,15,0.52)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-[22px] w-full max-w-xl mx-4 max-h-[92vh] overflow-hidden shadow-[0_24px_80px_-28px_rgba(42,26,18,0.45)] flex flex-col">
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#f3eee9] bg-white sticky top-0 z-10">
          <div>
            <div className="font-bold text-xl text-[#2a1a12]">Mes paramètres</div>
            <div className="text-xs text-[#9b8f88] mt-1">Profil, objectifs et connexions de Health Engine</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#f8f4f1] text-[#9b8f88] text-xl transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto px-7 py-6 space-y-7">
          {/* Profil */}
          <section>
            <SectionTitle
              eyebrow="Profil"
              title="Données personnelles"
              description="Utilisées pour les calculs métaboliques et les projections."
            />

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8a807a] block mb-1.5">Sexe</label>
                <select className="w-full border border-[#e9e1dc] rounded-xl px-3.5 py-2.5 text-sm bg-white" value={sexe} onChange={e => setSexe(e.target.value)}>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8a807a] block mb-1.5">Âge</label>
                  <input type="number" className="w-full border border-[#e9e1dc] rounded-xl px-3.5 py-2.5 text-sm" value={age} onChange={e => setAge(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-[#8a807a] block mb-1.5">Taille (cm)</label>
                  <input type="number" className="w-full border border-[#e9e1dc] rounded-xl px-3.5 py-2.5 text-sm" value={taille} onChange={e => setTaille(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-[#f3eee9]" />

          {/* Objectifs */}
          <section>
            <SectionTitle
              eyebrow="Objectifs"
              title="Trajectoire de poids"
              description="Le poids de départ sert de référence ; l’objectif alimente la progression et les projections."
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#8a807a] block mb-1.5">Poids de départ (kg)</label>
                <input type="number" step="0.1" className="w-full border border-[#e9e1dc] rounded-xl px-3.5 py-2.5 text-sm" value={poidsDepart} onChange={e => setPoidsDepart(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-[#8a807a] block mb-1.5">Objectif (kg)</label>
                <input type="number" step="0.1" className="w-full border border-[#e9e1dc] rounded-xl px-3.5 py-2.5 text-sm" value={poidsCible} onChange={e => setPoidsObj(Number(e.target.value))} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-[#fbf8f6] border border-[#f3eee9] p-4">
            <SectionTitle
              eyebrow="Nutrition"
              title="Macros dynamiques"
              description="Calculées automatiquement par Health Engine à partir de ton poids actuel et du budget calorique du jour."
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center border border-[#f3eee9]">
                <div className="text-xs text-blue-500 mb-1">Protéines</div>
                <div className="text-lg font-bold text-blue-600">~{proteinesDyn}g</div>
                <div className="text-[11px] text-[#9b8f88] mt-1">2 g/kg actuel</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-[#f3eee9]">
                <div className="text-xs text-amber-500 mb-1">Glucides</div>
                <div className="text-lg font-bold text-amber-600">variable</div>
                <div className="text-[11px] text-[#9b8f88] mt-1">reste du budget</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-[#f3eee9]">
                <div className="text-xs text-emerald-500 mb-1">Lipides</div>
                <div className="text-lg font-bold text-emerald-600">25%</div>
                <div className="text-[11px] text-[#9b8f88] mt-1">du budget</div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-[#8a807a] leading-relaxed">
              Poids actuel utilisé : <span className="font-semibold text-[#2a1a12]">{Number(poidsActuel).toFixed(1)} kg</span>. Les glucides absorbent le budget restant après protéines et lipides.
            </div>
          </section>

          <div className="border-t border-[#f3eee9]" />

          {/* Connexions */}
          <section>
            <SectionTitle
              eyebrow="Connexions"
              title="Sources de données"
              description="Les synchronisations restent indépendantes de l’IA."
            />
            <div className="rounded-2xl border border-[#f3eee9] bg-[#fbf8f6] p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="text-sm font-bold text-[#2a1a12]">Withings</div>
                  <div className="text-xs text-[#8a807a] mt-1">Poids, composition corporelle et pas synchronisés avec Health Engine.</div>
                </div>
              </div>
              <WithingsSync onRefresh={() => onSave?.()} />
            </div>

            <div className="rounded-2xl border border-[#f3eee9] bg-[#fbf8f6] p-4 mt-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-[#2a1a12]">Intelligence artificielle</div>
                  <div className="text-xs text-[#8a807a] mt-1">Les analyses et suggestions ne sont générées que lorsque tu cliques explicitement.</div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.08em] font-bold px-2.5 py-1.5 rounded-full bg-[#dff7ef] text-[#0f7b61] whitespace-nowrap">À la demande</span>
              </div>
            </div>
          </section>

          <div className="border-t border-[#f3eee9]" />

          {/* Maintenance */}
          <section>
            <SectionTitle
              eyebrow="Maintenance"
              title="Corriger les données historiques"
              description="Outils ponctuels pour réparer un jour incomplet ou recalculer un budget après une synchro tardive."
            />
            <div className="space-y-4">
              <RecalculerBudget />
              <div className="rounded-2xl bg-[#fbf8f6] border border-[#f3eee9] p-5">
                <div className="text-sm font-bold text-[#2a1a12] mb-1">Corriger un jour manquant</div>
                <div className="text-xs text-[#8a807a] mb-4">Recrée le budget d’une date avec les pas fournis et les séances déjà enregistrées.</div>
                <RecalculerJour />
              </div>
            </div>
          </section>

          <div className="border-t border-[#f3eee9]" />

          {/* Export */}
          <section>
            <SectionTitle
              eyebrow="Données"
              title="Exporter Health Engine"
              description="Télécharge une copie de tes données enregistrées."
            />
            <ExportDonnees
              poids={poids}
              composition={composition}
              repas={repas}
              seances={seances}
              pas={pas}
              dailyBudgets={dailyBudgets}
              objectifs={objectifsProps}
            />
          </section>
        </div>

        <div className="px-7 py-4 border-t border-[#f3eee9] bg-white sticky bottom-0 z-10">
          <button
            onClick={sauvegarder}
            disabled={loading}
            className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${succes ? 'bg-[#16b98e] text-white' : 'bg-gradient-to-br from-[#2a1a12] to-[#4a2c1e] text-white'} disabled:opacity-50`}
          >
            {loading ? 'Sauvegarde...' : succes ? '✓ Sauvegardé' : 'Sauvegarder les paramètres'}
          </button>
        </div>
      </div>
    </div>
  )
}
