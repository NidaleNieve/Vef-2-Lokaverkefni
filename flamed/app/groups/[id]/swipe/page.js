'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Swiper from '@/components/swiper'

export default function SwipePage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params?.id

  const [hostPrefs, setHostPrefs] = useState({ requireKidFriendly: false, maxRadius: '', blockedCategories: [] })
  const [playerPrefs, setPlayerPrefs] = useState({ radius: '', rating: '', price: '', kidFriendly: false, allergies: '', categories: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        // host prefs
        const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`)
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
        // my prefs
        const saved = localStorage.getItem('playerPrefs')
        if (saved) setPlayerPrefs(JSON.parse(saved))
      } catch (e) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    if (groupId) load()
  }, [groupId])

  if (loading) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="max-w-xl mx-auto p-4">
      <Swiper
        groupId={groupId}
        hostPreferences={hostPrefs}
        playerPreferences={playerPrefs}
        onFinished={() => router.push(`/groups/${groupId}/results`)}
      />
    </div>
  )
}
