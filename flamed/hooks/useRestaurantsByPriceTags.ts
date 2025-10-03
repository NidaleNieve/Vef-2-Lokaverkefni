// hooks/useRestaurantsByPriceTags.ts
'use client'

import { useEffect, useMemo, useState } from 'react'

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
  tags: string[]            // e.g. ['$', '$$ - $$$'] or include '(Unknown)'
  limit?: number
  offset?: number
  activeOnly?: boolean
}

export function useRestaurantsByPriceTags(opts: Options) {
  const { tags, limit = 12, offset = 0, activeOnly = true } = opts

  const [items, setItems] = useState<Restaurant[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const url = useMemo(() => {
    const sp = new URLSearchParams()
    tags.forEach(t => sp.append('tag', t))
    sp.set('limit', String(limit))
    sp.set('offset', String(offset))
    sp.set('activeOnly', String(activeOnly))
    return `/api/restaurants/filter/price?${sp.toString()}`
  }, [tags, limit, offset, activeOnly])

  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
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
  }, [url])

  return { items, count, loading, error }
}