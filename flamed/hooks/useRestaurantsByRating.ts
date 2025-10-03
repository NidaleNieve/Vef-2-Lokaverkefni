// hooks/useRestaurantsByRating.ts
'use client'

import { useEffect, useState } from 'react'

export type Restaurant = {
  id: string
  name: string
  avg_rating: number | null
  review_count: number | null
  parent_city: string | null
  price_tag: string | null
  cuisines: string[] | null
  is_active: boolean | null
}

type Options = {
  min?: number
  max?: number
  limit?: number
  offset?: number
  activeOnly?: boolean
}

export function useRestaurantsByRating(opts: Options) {
  const { min = 0, max = 5, limit = 12, offset = 0, activeOnly = true } = opts
  const [items, setItems] = useState<Restaurant[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const params = new URLSearchParams({
          min: String(min),
          max: String(max),
          limit: String(limit),
          offset: String(offset),
          activeOnly: String(activeOnly),
        })
        const res = await fetch(`/api/restaurants/filter/rating?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`)
        if (alive) {
          setItems(j.items || [])
          setCount(j.count ?? null)
        }
      } catch (e:any) {
        if (alive) setError(e.message || 'Failed to load restaurants')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [min, max, limit, offset, activeOnly])

  return { items, count, loading, error }
}