'use client'

import { useEffect, useMemo, useState } from 'react'
import PreferencesPanel from '@/components/preferences-panel'
import { useRouter } from 'next/navigation'

const DEFAULT_HOST_PREFS = { requireKidFriendly: false, maxRadius: '', blockedCategories: [] }
const DEFAULT_PLAYER_PREFS = { radius: '', rating: '', price: '', kidFriendly: false, allergies: '', categories: [] }

export default function CreateGroupPage() {
  const router = useRouter()
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const [hostPrefs, setHostPrefs] = useState(DEFAULT_HOST_PREFS)
  const [playerPrefs, setPlayerPrefs] = useState(DEFAULT_PLAYER_PREFS)

  const canCreate = useMemo(() => groupName.trim().length > 0, [groupName])

  async function createGroupAndStart() {
    setError('')
    if (!canCreate) return
    setCreating(true)
    try {
      // 1) Create group (RPC)
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim() }),
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || `Create failed (${res.status})`)
      const groupId = j.group_id

      // 2) Send host_prefs message so others can read constraints
      const hostPayload = {
        type: 'host_prefs',
        require_kid_friendly: !!hostPrefs.requireKidFriendly,
        max_radius_km: hostPrefs.maxRadius ? Number(hostPrefs.maxRadius) : null,
        blocked_categories: Array.isArray(hostPrefs.blockedCategories) ? hostPrefs.blockedCategories : [],
      }
      const msgRes = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: JSON.stringify(hostPayload) }),
        credentials: 'include',
      })
      const jm = await msgRes.json().catch(() => ({}))
      if (!msgRes.ok) throw new Error(jm?.error || `Message failed (${msgRes.status})`)

      // 3) Start round
      const roundRes = await fetch(`/api/groups/${groupId}/round`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
      })
      const jr = await roundRes.json().catch(() => ({}))
      if (!roundRes.ok) throw new Error(jr?.error || `Start round failed (${roundRes.status})`)

      // 4) Persist my player prefs locally for swipe page
      localStorage.setItem('playerPrefs', JSON.stringify(playerPrefs))

      // 5) Go to swipe page
      router.push(`/groups/${groupId}/swipe`)
    } catch (e) {
      setError(e.message || 'Failed to create game')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Create a game</h1>

      {error && <p className="text-red-600">{error}</p>}

      <label className="block">
        <span className="text-sm">Group name</span>
        <input
          className="border rounded p-2 w-full"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          placeholder="My group"
        />
      </label>

      <PreferencesPanel
        hostPrefs={hostPrefs}
        setHostPrefs={setHostPrefs}
        playerPrefs={playerPrefs}
        setPlayerPrefs={setPlayerPrefs}
        isHost={true}
      />

      <button
        className="border rounded px-3 py-2"
        disabled={!canCreate || creating}
        onClick={createGroupAndStart}
      >
        {creating ? 'Creating…' : 'Create game'}
      </button>
    </div>
  )
}
