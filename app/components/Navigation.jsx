'use client'

export default function Navigation({ ongletActif, setOnglet }) {
  const onglets = [
    { id: 'accueil', label: 'Accueil', emoji: '🏠' },
    { id: 'corps', label: 'Corps', emoji: '💪' },
    { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
    { id: 'sport', label: 'Sport', emoji: '🏃' },
    { id: 'coach', label: 'Coach', emoji: '🤖' },
  ]

  return (
    <div className="flex gap-2 mb-8 border-b border-gray-100 pb-4">
      {onglets.map(o => (
        <button
          key={o.id}
          onClick={() => setOnglet(o.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            ongletActif === o.id
              ? 'bg-black text-white font-medium'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <span>{o.emoji}</span>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}