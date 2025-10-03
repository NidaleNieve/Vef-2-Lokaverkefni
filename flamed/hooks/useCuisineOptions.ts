// hooks/useCuisineOptions.ts
'use client'

import { useEffect, useState } from 'react'

export type CuisineOption = { cuisine: string; count: number }

export function useCuisineOptions() {
  const [data, setData] = useState<CuisineOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/restaurants/meta/cuisines', { cache: 'no-store', credentials: 'include' })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`)
        if (alive) setData(j.items || [])
      } catch (e:any) {
        if (alive) setError(e.message || 'Failed to load cuisines')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return { data, loading, error }
}