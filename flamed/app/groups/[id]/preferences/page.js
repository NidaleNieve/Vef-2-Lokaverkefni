'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PreferencesPanel from '@/components/preferences-panel'

const DEFAULT_PLAYER_PREFS = { radius: '', rating: '', price: '', kidFriendly: false, allergies: '', categories: [] }

export default function PlayerPreferencesPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hostPrefs, setHostPrefs] = useState({ requireKidFriendly: false, maxRadius: '', blockedCategories: [] })
  const [playerPrefs, setPlayerPrefs] = useState(DEFAULT_PLAYER_PREFS)

  useEffect(() => {
    async function loadHostPrefs() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`)
        // find latest host_prefs message
        const items = Array.isArray(j.items) ? j.items : []
        for (const m of items) {
          try {
            const c = JSON.parse(m.content || '{}')
            if (c?.type === 'host_prefs') {
              setHostPrefs({
                requireKidFriendly: !!c.require_kid_friendly,
                maxRadius: c.max_radius_km ? String(c.max_radius_km) : '',
                blockedCategories: Array.isArray(c.blocked_categories) ? c.blocked_categories : [],
              })
              break
            }
          } catch {}
        }
        const saved = localStorage.getItem('playerPrefs')
        if (saved) setPlayerPrefs(JSON.parse(saved))
      } catch (e) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    if (groupId) loadHostPrefs()
  }, [groupId])

  if (loading) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Your preferences</h1>
      <PreferencesPanel
        hostPrefs={hostPrefs}
        setHostPrefs={setHostPrefs}
        playerPrefs={playerPrefs}
        setPlayerPrefs={setPlayerPrefs}
        isHost={false}
      />
      <button
        className="border rounded px-3 py-2"
        onClick={() => {
          localStorage.setItem('playerPrefs', JSON.stringify(playerPrefs))
          router.push(`/groups/${groupId}/swipe`)
        }}
      >
        Continue to swiping
      </button>
    </div>
  )
}
