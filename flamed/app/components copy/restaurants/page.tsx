// app/restaurants/page.tsx
'use client'

import { useEffect, useState } from 'react'

type GeocodedRestaurant = {
  id: string
  name?: string | null
  parent_city?: string | null
  formatted_address?: string | null
  // accept camelCase too, in case your API returns it that way
  formattedAddress?: string | null
  place_id?: string | null
  lat?: number | null
  lng?: number | null
  status?: string
}

export default function RestaurantsPage() {
  const [data, setData] = useState<GeocodedRestaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Ask your API to include the exact Google fields we need.
        // Make sure your /api/geocode route forwards "fields" to Google.
        const fields = encodeURIComponent('place_id,geometry,formatted_address,name')
        const res = await fetch(`/api/geocode?limit=50&fields=${fields}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const json = await res.json()
        setData(json.items || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p>Loading…</p>
  if (error)   return <p style={{ color: 'red' }}>{error}</p>

  return (
    <ul className="space-y-2">
      {data.map((r) => {
        const addr = r.formatted_address ?? r.formattedAddress ?? null
        const mapsHref =
          r.place_id
            ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`
            : (r.lat && r.lng)
              ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`
              : null

        return (
          <li key={r.id} className="flex items-start gap-2">
            <div>
              <strong>{r.name ?? 'Unknown'}</strong>
              {r.parent_city ? ` · ${r.parent_city}` : ''}
              {' · '}
              {addr ? (
                <span>{addr}</span>
              ) : (
                <span className="opacity-70">address unavailable</span>
              )}
              {mapsHref && (
                <>
                  {' '}
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    map
                  </a>
                </>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
