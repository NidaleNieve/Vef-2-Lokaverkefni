// ...existing code...
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
  mode = 'both', // ADDED: 'host' | 'personal' | 'both'
}) {
// ...existing code...

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
            {/* ...existing personal controls unchanged... */}
          </div>
          <p className="mt-3 text-xs italic text-gray-400">
            Filtering will hook into Supabase RPC once the backend is ready.
          </p>
        </section>
      )}
    </div>
  )
}