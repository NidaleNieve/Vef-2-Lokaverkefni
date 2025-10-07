import { useEffect, useMemo, useState } from 'react'

const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$']
const DEFAULT_MAX_RADIUS = 50

// Static cuisine categories (top-level -> sub-cuisines)
const STATIC_CUISINE_GROUPS = {
  European: [
    'French','Italian','Spanish','Mediterranean','Central European','Eastern European','German','Polish','British','Irish','Scandinavian','Danish','Basque','Campania','Neapolitan','Southern-Italian'
  ],
  Asian: [
    'Chinese','Japanese','Japanese Fusion','Thai','Korean','Vietnamese','Indian','Indonesian','Nepali','Pakistani','Szechuan','Tibetan'
  ],
  American: [
    'American','South American','Argentinean','Latin'
  ],
  MiddleEastern: [
    'Arabic','Turkish','Lebanese','Moroccan'
  ],
  FastFood: [
    'Fast Food','Pizza','Street Food','Deli','Soups'
  ],
  Seafood: ['Seafood'],
  GrillBarbecue: ['Grill','Barbecue','Steakhouse'],
  CafeBar: ['Cafe','Bar','Wine Bar','Brew Pub','Beer restaurants','Pub','Gastropub','Dining bars'],
  FusionContemporary: ['Fusion','Contemporary','International','Healthy'],
  Japanese_Sushi: ['Sushi'],
  Misc: [],
}

// Utility to merge server cuisines into static groups (uncategorized -> Misc)
function mergeCuisinesFromServer(staticGroups, serverList) {
  const lowerSet = new Set(
    Object.values(staticGroups).flat().map(s => s.toLowerCase())
  )
  const misc = new Set(staticGroups.Misc || [])
  for (const name of serverList || []) {
    const n = String(name || '').trim()
    if (!n) continue
    if (!lowerSet.has(n.toLowerCase())) misc.add(n)
  }
  return { ...staticGroups, Misc: Array.from(misc).sort() }
}

export default function PreferencesPanel({
  hostPrefs,
  setHostPrefs,
  playerPrefs,
  setPlayerPrefs,
  isHost = false,
  mode = 'both',
}) {
  const [cuisineGroups, setCuisineGroups] = useState(STATIC_CUISINE_GROUPS)
  // Allow expanding multiple categories at once
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  // Fetch all cuisines from server and merge into static groups placing new ones into Misc
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/restaurants/meta/cuisines', { cache: 'no-store' })
        const j = await res.json().catch(() => ({}))
        if (res.ok && Array.isArray(j?.items)) {
          const merged = mergeCuisinesFromServer(STATIC_CUISINE_GROUPS, j.items)
          if (!cancelled) setCuisineGroups(merged)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // Host only blocks TOP-LEVEL categories (group names). Store group keys in blockedCategories.
  const toggleHostTopLevel = (groupKey) => {
    setHostPrefs(prev => {
      const list = new Set(prev.blockedCategories || [])
      list.has(groupKey) ? list.delete(groupKey) : list.add(groupKey)
      return { ...prev, blockedCategories: Array.from(list) }
    })
  }

  // Host blocks should disable in player panel
  const isBlocked = (cat) => hostPrefs.blockedCategories.includes(cat)

  return (
    <div className="mb-6 space-y-4 text-sm">
      {(mode === 'host' || mode === 'both') && (
        <section className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-black/60">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Host controls (optional)</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {isHost ? 'Only for creators' : 'View only'}
            </span>
          </div>
          <div className="space-y-3">
            <label className={`flex items-center gap-2 ${!isHost ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input
                type="checkbox"
                disabled={!isHost}
                checked={hostPrefs.requireKidFriendly}
                onChange={e =>
                  setHostPrefs(prev => ({
                    ...prev,
                    requireKidFriendly: e.target.checked,
                  }))
                }
              />
              <span>Require kid friendly venues</span>
            </label>

            <div>
              <label className={`flex items-center justify-between gap-3 ${!isHost ? 'opacity-60' : ''}`}>
                <span>Maximum radius (km)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={DEFAULT_MAX_RADIUS}
                    disabled={!isHost}
                    value={hostPrefs.maxRadius}
                    onChange={e => {
                      const raw = e.target.value
                      if (!raw) {
                        setHostPrefs(prev => ({ ...prev, maxRadius: '' }))
                        return
                      }
                      const numeric = Math.max(
                        1,
                        Math.min(Number(raw), DEFAULT_MAX_RADIUS),
                      )
                      setHostPrefs(prev => ({ ...prev, maxRadius: String(numeric) }))
                    }}
                    className="w-20 rounded border border-gray-300 bg-white/80 p-1 text-right text-sm dark:border-gray-700 dark:bg-black/60"
                    placeholder="Any"
                  />
                  {hostPrefs.maxRadius && isHost && (
                    <button
                      type="button"
                      onClick={() =>
                        setHostPrefs(prev => ({ ...prev, maxRadius: '' }))
                      }
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Players may still choose a smaller radius.
              </p>
            </div>

            <div>
              <p className="font-medium">Blocked categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(cuisineGroups).map(group => {
                  const label = group === 'Japanese_Sushi' ? 'Japanese/Sushi' : group.replace(/([A-Z])/g, ' $1').trim()
                  const blockedTop = hostPrefs.blockedCategories.includes(group)
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => isHost && toggleHostTopLevel(group)}
                      disabled={!isHost}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        blockedTop
                          ? 'border-red-400 bg-red-100 text-red-700 dark:border-red-600 dark:bg-red-900/40 dark:text-red-200'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:border-blue-500'
                      }`}
                    >
                      {blockedTop ? 'Blocked: ' : ''}{label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-gray-500">Host can only block entire top-level cuisine groups. Players will see all sub-cuisines under blocked groups disabled.</p>
            </div>
            {/* Host: Max price control */}
            <div>
              <label className={`flex items-center justify-between gap-3 ${!isHost ? 'opacity-60' : ''}`}>
                <span>Maximum price</span>
                <div className="flex items-center gap-2">
                  {PRICE_OPTIONS.map(p => {
                    const selected = hostPrefs.maxPrice === p
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={!isHost}
                        onClick={() => isHost && setHostPrefs(prev => ({ ...prev, maxPrice: prev.maxPrice === p ? undefined : p }))}
                        className={`rounded border px-2 py-1 text-xs ${selected ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'}`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  {hostPrefs.maxPrice && isHost && (
                    <button
                      type="button"
                      onClick={() => setHostPrefs(prev => ({ ...prev, maxPrice: undefined }))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
              <p className="mt-1 text-xs text-gray-500">Players can’t pick a price above this.</p>
            </div>
          </div>
        </section>
      )}

      {(mode === 'personal' || mode === 'both') && (
        <section className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-black/60">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Personal preferences</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Optional
            </span>
          </div>
          <div className="space-y-3">
            {/** Removed duplicate first Radius and Price UI; constrained versions below remain **/}

            <div>
              <p className="font-medium">Cuisine preferences</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(cuisineGroups).map(group => {
                  const label = group === 'Japanese_Sushi' ? 'Japanese/Sushi' : group.replace(/([A-Z])/g, ' $1').trim()
                  const blocked = hostPrefs.blockedCategories.includes(group)
                  const isExpanded = expandedGroups.has(group)
                  return (
                    <button
                      key={group}
                      type="button"
                      disabled={blocked}
                      onClick={() => {
                        if (blocked) return
                        // Auto-select all subcats for any OTHER expanded group with none selected
                        const otherExpanded = Array.from(expandedGroups).filter(g => g !== group)
                        let newCats = new Set(Array.isArray(playerPrefs.categories) ? playerPrefs.categories : [])
                        for (const g of otherExpanded) {
                          const subs = cuisineGroups[g] || []
                          const hasAny = subs.some(s => newCats.has(s))
                          if (!hasAny) subs.forEach(s => newCats.add(s))
                        }
                        setPlayerPrefs(prev => ({ ...prev, categories: Array.from(newCats) }))
                        // Toggle expansion of clicked group
                        setExpandedGroups(prev => {
                          const n = new Set(prev)
                          if (n.has(group)) n.delete(group); else n.add(group)
                          return n
                        })
                      }}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        blocked
                          ? 'opacity-50 cursor-not-allowed border-gray-300'
                          : isExpanded
                            ? 'border-blue-500 text-blue-600'
                            : 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Render subcategories for all expanded groups */}
              {Array.from(expandedGroups).length > 0 && (
                <div className="mt-3 space-y-2">
                  {Array.from(expandedGroups).map(group => (
                    <div key={group} className="flex flex-wrap gap-2">
                      {(cuisineGroups[group] || []).map(cat => {
                        const chosen = Array.isArray(playerPrefs.categories) && playerPrefs.categories.includes(cat)
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              const set = new Set(Array.isArray(playerPrefs.categories) ? playerPrefs.categories : [])
                              chosen ? set.delete(cat) : set.add(cat)
                              setPlayerPrefs(prev => ({ ...prev, categories: Array.from(set) }))
                            }}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              chosen
                                ? 'border-blue-400 bg-blue-100 text-blue-700 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-200'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:border-blue-500'
                            }`}
                          >
                            {cat}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">Host-blocked cuisines are disabled here.</p>
            </div>

            {/* Player: Enforce host max constraints visually */}
            <div>
              <label className="flex items-center justify-between gap-3">
                <span>Price</span>
                <div className="flex items-center gap-2">
                  {PRICE_OPTIONS.map(p => {
                    // If host set a maxPrice, disable options above it
                    const hostIdx = hostPrefs.maxPrice ? PRICE_OPTIONS.indexOf(hostPrefs.maxPrice) : PRICE_OPTIONS.length - 1
                    const idx = PRICE_OPTIONS.indexOf(p)
                    const disabled = idx > hostIdx
                    const selected = Array.isArray(playerPrefs.price) ? playerPrefs.price.includes(p) : false
                    return (
                      <label key={p} className={`inline-flex items-center gap-1 ${disabled ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={selected}
                          onChange={e => {
                            const list = new Set(Array.isArray(playerPrefs.price) ? playerPrefs.price : [])
                            if (e.target.checked) list.add(p); else list.delete(p)
                            setPlayerPrefs(prev => ({ ...prev, price: Array.from(list) }))
                          }}
                        />
                        <span>{p}</span>
                      </label>
                    )
                  })}
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center justify-between gap-3">
                <span>Radius (km)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={DEFAULT_MAX_RADIUS}
                    value={playerPrefs.radius}
                    onChange={e => {
                      let v = e.target.value
                      if (hostPrefs.maxRadius) {
                        const hostMax = Number(hostPrefs.maxRadius) || DEFAULT_MAX_RADIUS
                        const n = Math.min(Number(v || '0'), hostMax)
                        v = String(n || '')
                      }
                      setPlayerPrefs(prev => ({ ...prev, radius: v }))
                    }}
                    className="w-20 rounded border border-gray-300 bg-white/80 p-1 text-right text-sm dark:border-gray-700 dark:bg-black/60"
                    placeholder="Any"
                  />
                  {playerPrefs.radius && (
                    <button
                      type="button"
                      onClick={() => setPlayerPrefs(prev => ({ ...prev, radius: '' }))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
              <p className="mt-1 text-xs text-gray-500">If host set a maximum radius, your input is capped to that value.</p>
            </div>
          </div>
          <p className="mt-3 text-xs italic text-gray-400">
            Filtering will hook into Supabase RPC once the backend is ready.
          </p>
        </section>
      )}
    </div>
  )
}