

'use client'

import { useEffect, useState } from 'react'
import Swiper from './swiper'

export default function HomeClient() {
  const [groupInput, setGroupInput] = useState('')
  const [groupId, setGroupId] = useState('')

  useEffect(() => {
    const last = localStorage.getItem('lastGroupId') || ''
    if (last) {
      setGroupInput(last)
      setGroupId(last)
    }
  }, [])

  useEffect(() => {
    if (groupId) localStorage.setItem('lastGroupId', groupId)
  }, [groupId])

  async function startRound() {
    if (!groupInput.trim()) return
    const res = await fetch(`/api/groups/${groupInput.trim()}/round`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j?.error || `Failed to start round (${res.status})`)
      return
    }
    setGroupId(groupInput.trim())
  }

  return (
    <div className="w-full max-w-xl">
      <h1 className="text-4xl font-bold mb-4">Restaurants</h1>
      <div className="mb-6 flex gap-2 items-center">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Enter group id (uuid)"
          value={groupInput}
          onChange={e => setGroupInput(e.target.value)}
        />
        <button
          className="border rounded px-3 py-2"
          onClick={() => setGroupId(groupInput.trim())}
          disabled={!groupInput.trim()}
        >
          Join
        </button>
        <button
          className="border rounded px-3 py-2"
          onClick={startRound}
          disabled={!groupInput.trim()}
        >
          Start round
        </button>
      </div>
      <Swiper groupId={groupId || undefined} />
    </div>
  )
}