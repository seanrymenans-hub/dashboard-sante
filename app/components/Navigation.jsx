'use client'

export default function Navigation({ ongletActif, setOnglet, onOpenParametres, userName = 'Utilisateur', userPlan = 'Plan' }) {

  const onglets = [
    {
      id: 'accueil',
      label: 'Accueil',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <rect x="1" y="1" width="7" height="7" rx="2" fill="currentColor" />
          <rect x="10" y="1" width="7" height="7" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="1" y="10" width="7" height="7" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="10" y="10" width="7" height="7" rx="2" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'corps',
      label: 'Corps',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9 L12.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'nutrition',
      label: 'Nutrition',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <rect x="2" y="3" width="14" height="2.2" rx="1.1" fill="currentColor" />
          <rect x="2" y="8" width="14" height="2.2" rx="1.1" fill="currentColor" />
          <rect x="2" y="13" width="9" height="2.2" rx="1.1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'sport',
      label: 'Sport',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="4" cy="9" r="3" fill="currentColor" />
          <circle cx="14" cy="9" r="3" fill="currentColor" />
          <rect x="6" y="8" width="6" height="2" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'coach',
      label: 'Coach IA',
      icon: <span style={{ fontSize: 16, width: 18, textAlign: 'center', display: 'inline-block' }}>✦</span>,
    },
  ]

  return (
    <>
      {/* ── Sidebar desktop (cachée sur mobile) ── */}
      <aside className="hidden md:flex flex-none w-[236px] bg-[#2a1a12] text-white flex-col h-screen sticky top-0 px-[18px] py-[26px]">
        <div className="flex items-center gap-[11px] px-2 pb-7">
          <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[#ff6b4a] to-[#ff9248] flex items-center justify-center text-lg font-extrabold">
            ⚡
          </div>
          <div className="text-[17px] font-extrabold tracking-tight">Health Engine</div>
        </div>

        <nav className="flex flex-col gap-1">
          {onglets.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-[13px] text-sm font-semibold transition-all text-left ${
                ongletActif === o.id
                  ? 'bg-gradient-to-br from-[#ff6b4a] to-[#ff8a3d] text-white shadow-[0_8px_18px_-8px_rgba(255,107,74,0.7)]'
                  : 'text-[#c9b3a8] hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              {o.icon}
              <span>{o.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <button onClick={onOpenParametres} className="flex items-center gap-3 px-3.5 py-3 rounded-[13px] text-sm font-semibold text-[#c9b3a8] hover:bg-white/[0.07] hover:text-white transition-all text-left">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="9" r="2.4" fill="currentColor" />
            </svg>
            <span>Réglages</span>
          </button>
          <div className="mt-3.5 p-3.5 rounded-2xl bg-white/[0.06] flex items-center gap-[11px]">
            <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#16c79a] to-[#13a884] flex items-center justify-center text-[13px] font-extrabold flex-shrink-0">
              {userName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold truncate">{userName}</div>
              <div className="text-[11px] text-[#a88e82] truncate">{userPlan}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Barre du bas mobile (cachée sur desktop) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#2a1a12] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {onglets.map(o => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all ${
              ongletActif === o.id ? 'text-[#ff8a3d]' : 'text-[#7a6058]'
            }`}
          >
            {o.icon}
            <span className="text-[10px] font-bold">{o.label}</span>
          </button>
        ))}
        <button
          onClick={onOpenParametres}
          className="flex-none w-12 flex flex-col items-center justify-center gap-1 py-2.5 text-[#7a6058]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="9" cy="9" r="2.4" fill="currentColor" />
          </svg>
          <span className="text-[10px] font-bold">Réglages</span>
        </button>
      </nav>
    </>
  )
}