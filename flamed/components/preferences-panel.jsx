import { useEffect, useMemo } from 'react'

const CATEGORY_OPTIONS = ['Indian', 'Buffet', 'Fast Food', 'Traditional']
const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$']
const DEFAULT_MAX_RADIUS = 50

export default function PreferencesPanel({
  hostPrefs,
  setHostPrefs,
  playerPrefs,
  setPlayerPrefs,
  isHost = false,
}) {
  useEffect(() => {
    if (hostPrefs.requireKidFriendly && !playerPrefs.kidFriendly) {
      setPlayerPrefs(prev => ({ ...prev, kidFriendly: true }))
    }
  }, [hostPrefs.requireKidFriendly, playerPrefs.kidFriendly, setPlayerPrefs])

  useEffect(() => {
    if (!hostPrefs.maxRadius) return
    const max = Number(hostPrefs.maxRadius)
    setPlayerPrefs(prev => {
      if (!prev.radius) return prev
      const current = Number(prev.radius)
      if (Number.isNaN(current) || current <= max) return prev
      return { ...prev, radius: String(max) }
    })
  }, [hostPrefs.maxRadius, setPlayerPrefs])

  useEffect(() => {
    if (!hostPrefs.blockedCategories.length) return
    setPlayerPrefs(prev => {
      const filtered = prev.categories.filter(
        cat => !hostPrefs.blockedCategories.includes(cat),
      )
      if (filtered.length === prev.categories.length) return prev
      return { ...prev, categories: filtered }
    })
  }, [hostPrefs.blockedCategories, setPlayerPrefs])

  const effectiveMaxRadius = useMemo(() => {
    const value = Number(hostPrefs.maxRadius)
    if (!hostPrefs.maxRadius || Number.isNaN(value)) return DEFAULT_MAX_RADIUS
    return Math.max(1, Math.min(value, DEFAULT_MAX_RADIUS))
  }, [hostPrefs.maxRadius])

  const toggleHostCategory = cat => {
    setHostPrefs(prev => {
      const blocked = prev.blockedCategories.includes(cat)
      const blockedCategories = blocked
        ? prev.blockedCategories.filter(c => c !== cat)
        : [...prev.blockedCategories, cat]
      return { ...prev, blockedCategories }
    })
  }

  const togglePlayerCategory = cat => {
    if (hostPrefs.blockedCategories.includes(cat)) return
    setPlayerPrefs(prev => {
      const selected = prev.categories.includes(cat)
      const categories = selected
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
      return { ...prev, categories }
    })
  }

  return (
    <div className="mb-6 space-y-4 text-sm">
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
              {CATEGORY_OPTIONS.map(cat => {
                const blocked = hostPrefs.blockedCategories.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => isHost && toggleHostCategory(cat)}
                    disabled={!isHost}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      blocked
                        ? 'border-red-400 bg-red-100 text-red-700 dark:border-red-600 dark:bg-red-900/40 dark:text-red-200'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:border-blue-500'
                    }`}
                  >
                    {blocked ? 'Blocked: ' : ''}
                    {cat}
                  </button>
                )
              })}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Blocked categories appear disabled for other players.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-black/60">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Personal preferences</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Optional
          </span>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span>Distance (km)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={effectiveMaxRadius}
                value={playerPrefs.radius}
                onChange={e => {
                  const raw = e.target.value
                  if (!raw) {
                    setPlayerPrefs(prev => ({ ...prev, radius: '' }))
                    return
                  }
                  const numeric = Math.max(
                    1,
                    Math.min(Number(raw), effectiveMaxRadius),
                  )
                  setPlayerPrefs(prev => ({ ...prev, radius: String(numeric) }))
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

          <label className="flex items-center justify-between gap-3">
            <span>Minimum rating</span>
            <select
              value={playerPrefs.rating}
              onChange={e =>
                setPlayerPrefs(prev => ({ ...prev, rating: e.target.value }))
              }
              className="w-32 rounded border border-gray-300 bg-white/80 p-1 text-sm dark:border-gray-700 dark:bg-black/60"
            >
              <option value="">Any</option>
              <option value="3">3+</option>
              <option value="3.5">3.5+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Price ceiling</span>
            <select
              value={playerPrefs.price}
              onChange={e =>
                setPlayerPrefs(prev => ({ ...prev, price: e.target.value }))
              }
              className="w-32 rounded border border-gray-300 bg-white/80 p-1 text-sm dark:border-gray-700 dark:bg-black/60"
            >
              <option value="">Any</option>
              {PRICE_OPTIONS.map(price => (
                <option key={price} value={price}>
                  {price}
                </option>
              ))}
            </select>
          </label>

          <label
            className={`flex items-center gap-2 ${
              hostPrefs.requireKidFriendly ? 'text-gray-400 dark:text-gray-500' : ''
            }`}
          >
            <input
              type="checkbox"
              disabled={hostPrefs.requireKidFriendly}
              checked={
                hostPrefs.requireKidFriendly ? true : playerPrefs.kidFriendly
              }
              onChange={e =>
                setPlayerPrefs(prev => ({
                  ...prev,
                  kidFriendly: e.target.checked,
                }))
              }
            />
            <span>Kid friendly only</span>
          </label>

          <label className="flex flex-col gap-1">
            <span>Allergy notes</span>
            <textarea
              rows={2}
              value={playerPrefs.allergies}
              onChange={e =>
                setPlayerPrefs(prev => ({ ...prev, allergies: e.target.value }))
              }
              className="rounded border border-gray-300 bg-white/80 p-2 text-sm dark:border-gray-700 dark:bg-black/60"
              placeholder="e.g. peanuts, shellfish"
            />
          </label>

          <div>
            <p className="font-medium">Categories</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(cat => {
                const blocked = hostPrefs.blockedCategories.includes(cat)
                const selected = playerPrefs.categories.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={blocked}
                    onClick={() => togglePlayerCategory(cat)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      blocked
                        ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
                        : selected
                        ? 'border-blue-500 bg-blue-100 text-blue-700 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-200'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:border-blue-500'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Host-blocked categories are unavailable.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs italic text-gray-400">
          Filtering will hook into Supabase RPC once the backend is ready.
        </p>
      </section>
    </div>
  )
}