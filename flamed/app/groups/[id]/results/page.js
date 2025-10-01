'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function ResultsPage() {
  const params = useParams()
  const groupId = params?.id
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        // latest session id
        const roundRes = await fetch(`/api/groups/${groupId}/round`, { credentials: 'include' })
        const jr = await roundRes.json().catch(()=>({}))
        if (!roundRes.ok) throw new Error(jr?.error || `Round failed (${roundRes.status})`)
        const sid = jr?.session_id || ''
        setSessionId(sid)
        if (!sid) throw new Error('No active session')

        // aggregate
        const aggRes = await fetch(`/api/groups/${groupId}/results?session_id=${encodeURIComponent(sid)}`, { credentials: 'include' })
        const ja = await aggRes.json().catch(()=>({}))
        if (!aggRes.ok) throw new Error(ja?.error || `Results failed (${aggRes.status})`)
        setData(ja)
      } catch (e) {
        setError(e.message || 'Failed to load results')
      } finally {
        setLoading(false)
      }
    }
    if (groupId) load()
  }, [groupId])

  if (loading) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-semibold">Group results</h1>
      <pre className="text-xs whitespace-pre-wrap border p-2 bg-white/40">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
