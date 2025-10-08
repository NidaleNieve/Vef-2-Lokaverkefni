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
  // Allow expanding multiple categories at once with ordering (most recently clicked first)
  const [expandedGroups, setExpandedGroups] = useState([])
  // Track if user explicitly picked any subcategory for a group
  const [touchedGroups, setTouchedGroups] = useState({})
  // Track groups where all subcategories were auto-selected implicitly
  const [implicitAllGroups, setImplicitAllGroups] = useState({})

  // Reset player preferences and local UI state
  const onResetPlayer = () => {
    setPlayerPrefs({
      radius: '',
      rating: '',
      price: [],
      kidFriendly: false,
      allergies: '',
      categories: [],
    })
    setExpandedGroups([])
    setTouchedGroups({})
    setImplicitAllGroups({})
  }

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

    <div className="mb-6 space-y-6 text-sm animate-fade-in">
      {(mode === 'host' || mode === 'both') && (
        <section className="animate-fade-in-up rounded-xl p-6 transition-all duration-300 hover:shadow-lg" style={{
          backgroundColor: 'var(--nav-item-bg)',
          border: '1px solid var(--nav-shadow)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div className="mb-4 flex items-center justify-between animate-fade-in-up">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Host controls (optional)</h2>
            <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full" style={{ 
              color: 'var(--muted)', 
              backgroundColor: 'var(--nav-item-hover)'
            }}>
              {isHost ? 'Only for creators' : 'View only'}
            </span>
          </div>
          <div className="space-y-3">
            {/* Player: Minimum rating (hidden for host) */}
            {!isHost && (
              <div>
                <label className="flex items-center justify-between gap-3">
                  <span>Minimum rating</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.5"
                      value={playerPrefs.rating}
                      onChange={e => {
                        const raw = e.target.value
                        if (raw === '') {
                          setPlayerPrefs(prev => ({ ...prev, rating: '' }))
                          return
                        }
                        const n = Math.max(0, Math.min(5, Number(raw)))
                        setPlayerPrefs(prev => ({ ...prev, rating: String(n) }))
                      }}
                      className="w-24 rounded-lg p-2 text-right text-sm transition-all duration-200 focus:scale-105 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--nav-shadow)',
                        color: 'var(--foreground)',
                        '--tw-ring-color': 'var(--accent)'
                      }}
                      placeholder="Any"
                    />
                    {playerPrefs.rating && (
                      <button
                        type="button"
                        onClick={() => setPlayerPrefs(prev => ({ ...prev, rating: '' }))}
                        className="text-xs px-2 py-1 rounded-md transition-all duration-200 hover:scale-105"
                        style={{
                          color: 'var(--accent)',
                          backgroundColor: 'var(--nav-item-hover)'
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </label>
                <p className="mt-1 text-xs text-gray-500">Only show restaurants rated at or above this value.</p>
              </div>
            )}
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
                    className="w-20 rounded-lg p-2 text-right text-sm transition-all duration-200 focus:scale-105 focus:outline-none focus:ring-2 disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--nav-shadow)',
                      color: 'var(--foreground)',
                      '--tw-ring-color': 'var(--accent)'
                    }}
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

            <div className="animate-fade-in-up-delayed">
              <p className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Blocked categories</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(cuisineGroups).map(group => {
                  const label = group === 'Japanese_Sushi' ? 'Japanese/Sushi' : group.replace(/([A-Z])/g, ' $1').trim()
                  const blockedTop = hostPrefs.blockedCategories.includes(group)
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => isHost && toggleHostTopLevel(group)}
                      disabled={!isHost}
                      className="rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-60"
                      style={{
                        backgroundColor: blockedTop ? '#fecaca' : 'var(--nav-item-bg)',
                        border: `1px solid ${blockedTop ? '#f87171' : 'var(--nav-shadow)'}`,
                        color: blockedTop ? '#dc2626' : 'var(--foreground)',
                        boxShadow: blockedTop ? '0 2px 8px rgba(248, 113, 113, 0.3)' : 'none'
                      }}
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
                        onClick={() => {
                          if (isHost) {
                            setHostPrefs(prev => ({ ...prev, maxPrice: prev.maxPrice === p ? undefined : p }))
                            // Add animation feedback
                            const btn = document.activeElement
                            btn?.classList.add('animate-pulse-shrink')
                            setTimeout(() => btn?.classList.remove('animate-pulse-shrink'), 500)
                          }
                        }}
                        className="rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-60"
                        style={{
                          backgroundColor: selected ? 'var(--accent)' : 'var(--nav-item-bg)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--nav-shadow)'}`,
                          color: selected ? 'var(--nav-text)' : 'var(--foreground)',
                          boxShadow: selected ? '0 2px 8px rgba(170, 96, 200, 0.3)' : 'none'
                        }}
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
        <section className="animate-fade-in-up-delayed rounded-xl p-6 transition-all duration-300 hover:shadow-lg" style={{
          backgroundColor: 'var(--nav-item-bg)',
          border: '1px solid var(--nav-shadow)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div className="mb-4 flex items-center justify-between animate-fade-in-up">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Personal preferences</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full" style={{ 
                color: 'var(--muted)', 
                backgroundColor: 'var(--nav-item-hover)'
              }}>Optional</span>
              <button
                type="button"
                onClick={onResetPlayer}
                className="text-xs px-3 py-1 rounded-md transition-all duration-200 hover:scale-105"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'var(--nav-item-hover)'
                }}
                title="Reset preferences"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {/** Removed duplicate first Radius and Price UI; constrained versions below remain **/}

            <div>
              <p className="font-medium">Cuisine preferences</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(cuisineGroups).map(group => {
                  const label = group === 'Japanese_Sushi' ? 'Japanese/Sushi' : group.replace(/([A-Z])/g, ' $1').trim()
                  const blocked = hostPrefs.blockedCategories.includes(group)
                  const isExpanded = Array.isArray(expandedGroups) && expandedGroups.includes(group)
                  return (
                    <button
                      style={{ 
                        color: 'var(--nav-text)',
                      }}
                      key={group}
                      type="button"
                      disabled={blocked}
                      onClick={() => {
                        if (blocked) return
                        // Auto-select all subcats for any OTHER expanded group with none selected and untouched
                        const otherExpanded = (Array.isArray(expandedGroups) ? expandedGroups : []).filter(g => g !== group)
                        const newCats = new Set(Array.isArray(playerPrefs.categories) ? playerPrefs.categories : [])
                        const newImplicit = { ...implicitAllGroups }
                        for (const g of otherExpanded) {
                          const subs = cuisineGroups[g] || []
                          const hasAny = subs.some(s => newCats.has(s))
                          const touched = !!touchedGroups[g]
                          if (!touched && !hasAny) {
                            subs.forEach(s => newCats.add(s))
                            newImplicit[g] = true
                          }
                        }
                        setImplicitAllGroups(newImplicit)
                        setPlayerPrefs(prev => ({ ...prev, categories: Array.from(newCats) }))
                        // Toggle expansion of clicked group; keep newest on top
                        setExpandedGroups(prev => {
                          const arr = Array.isArray(prev) ? prev.slice() : []
                          const idx = arr.indexOf(group)
                          if (idx >= 0) {
                            arr.splice(idx, 1)
                            return arr
                          } else {
                            return [group, ...arr]
                          }
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

              {/* Render subcategories for all expanded groups; most recently clicked first */}
              {Array.isArray(expandedGroups) && expandedGroups.length > 0 && (
                <div className="mt-3 space-y-3">
                  {expandedGroups.map(group => {
                    // If all subcategories were auto-selected implicitly and user hasn't touched this group,
                    // hide the overwhelming list; keep them selected in the background.
                    if (implicitAllGroups[group] && !touchedGroups[group]) {
                      return null
                    }
                    return (
                      <div key={group} className="flex flex-wrap gap-2 mb-3">
                        {(cuisineGroups[group] || []).map(cat => {
                          const chosen = Array.isArray(playerPrefs.categories) && playerPrefs.categories.includes(cat)
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setTouchedGroups(prev => ({ ...prev, [group]: true }))
                                const set = new Set(Array.isArray(playerPrefs.categories) ? playerPrefs.categories : [])
                                chosen ? set.delete(cat) : set.add(cat)
                                // User is explicitly picking; not implicit all anymore
                                setImplicitAllGroups(prev => ({ ...prev, [group]: false }))
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
                    )
                  })}
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