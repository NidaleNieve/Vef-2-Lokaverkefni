// app/restaurants/search-test/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'

type Restaurant = {
  id: string
  name: string
  avg_rating: number | null
  review_count: number | null
  price_tag: string | null
  parent_city: string | null
  cuisines: string[] | null
  is_active: boolean | null
}

type CuisineOption = { cuisine: string; count: number }
type PriceTagOption = { price_tag: string; count: number }

// Change this if your route is different:
const SEARCH_API = '/api/restaurants/filter/search' // or '/api/restaurants/filter/search'

export default function SearchTestPage() {
  // ----- form state -----
  const [minRating, setMinRating] = useState<number | ''>('')
  const [maxRating, setMaxRating] = useState<number | ''>('')
  const [city, setCity] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [random, setRandom] = useState(false)
  const [limit, setLimit] = useState(12)
  const [offset, setOffset] = useState(0)

  // Multi-selects
  const [cuisineOptions, setCuisineOptions] = useState<CuisineOption[]>([])
  const [priceOptions, setPriceOptions] = useState<PriceTagOption[]>([])
  const [cuisinesAny, setCuisinesAny] = useState<string[]>([]) // ANY-of
  const [cuisinesAll, setCuisinesAll] = useState<string[]>([]) // ALL-of
  const [priceTags, setPriceTags] = useState<string[]>([])     // $, $$ - $$$, $$$$, (Unknown)

  // ----- results state -----
  const [items, setItems] = useState<Restaurant[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [lastRequest, setLastRequest] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load dropdown options (cuisines + prices)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/restaurants/meta/cuisines', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/restaurants/meta/price-tags', { cache: 'no-store', credentials: 'include' }),
        ])
        const cJson = await cRes.json()
        const pJson = await pRes.json()
        if (alive) {
          setCuisineOptions(cJson.items || [])
          setPriceOptions(pJson.items || [])
        }
      } catch (e) {
        // non-fatal for page; your dropdowns will just be empty
      }
    })()
    return () => { alive = false }
  }, [])

  // Helpers to toggle selections
  const toggleFrom = (arr: string[], val: string, setter: (next: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  async function runSearch() {
    setLoading(true)
    setError(null)

    const filters: any = {
      active_only: activeOnly,
      random,
    }
    if (minRating !== '') filters.min_rating = Number(minRating)
    if (maxRating !== '') filters.max_rating = Number(maxRating)
    if (city.trim()) filters.city = city.trim()
    if (cuisinesAny.length) filters.cuisines_any = cuisinesAny
    if (cuisinesAll.length) filters.cuisines_all = cuisinesAll
    if (priceTags.length)   filters.price_tags   = priceTags

    const body = { filters, limit, offset }
    setLastRequest(body)

    try {
      const res = await fetch(SEARCH_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',  // keep if RLS requires auth
        cache: 'no-store',
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      setItems(json.items || [])
      setCount(json.count ?? null)
    } catch (e: any) {
      setError(e.message || 'Request failed')
      setItems([])
      setCount(null)
    } finally {
      setLoading(false)
    }
  }

  // convenience: initial load once
  useEffect(() => {
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Restaurants – Search Tester</h1>

      {/* Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Rating */}
        <div className="space-y-2">
          <label className="block text-sm">Min rating (0–5)</label>
          <input
            className="border p-2 w-full"
            type="number" min={0} max={5} step="0.1"
            value={minRating}
            onChange={e => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Max rating (0–5)</label>
          <input
            className="border p-2 w-full"
            type="number" min={0} max={5} step="0.1"
            value={maxRating}
            onChange={e => setMaxRating(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="block text-sm">City (ILIKE)</label>
          <input className="border p-2 w-full" value={city} onChange={e=>setCity(e.target.value)} placeholder="Reykjavik" />
        </div>

        {/* Active / Random */}
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)} />
            Active only
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={random} onChange={e=>setRandom(e.target.checked)} />
            Randomize results
          </label>
        </div>

        {/* Cuisines (ANY) */}
        <div className="space-y-2 md:col-span-2">
          <div className="text-sm font-medium">Cuisines – ANY of</div>
          <div className="flex flex-wrap gap-2">
            {cuisineOptions.map(o => (
              <button
                key={`any-${o.cuisine}`}
                type="button"
                onClick={() => toggleFrom(cuisinesAny, o.cuisine, setCuisinesAny)}
                className={`border px-3 py-1 rounded text-sm ${cuisinesAny.includes(o.cuisine) ? 'bg-black text-white' : ''}`}
                title={`${o.count} restaurants`}
              >
                {o.cuisine}
              </button>
            ))}
          </div>
        </div>

        {/* Cuisines (ALL) */}
        <div className="space-y-2 md:col-span-2">
          <div className="text-sm font-medium">Cuisines – MUST include all</div>
          <div className="flex flex-wrap gap-2">
            {cuisineOptions.map(o => (
              <button
                key={`all-${o.cuisine}`}
                type="button"
                onClick={() => toggleFrom(cuisinesAll, o.cuisine, setCuisinesAll)}
                className={`border px-3 py-1 rounded text-sm ${cuisinesAll.includes(o.cuisine) ? 'bg-black text-white' : ''}`}
                title={`${o.count} restaurants`}
              >
                {o.cuisine}
              </button>
            ))}
          </div>
        </div>

        {/* Price tags */}
        <div className="space-y-2 md:col-span-2">
          <div className="text-sm font-medium">Price tags</div>
          <div className="flex flex-wrap gap-2">
            {priceOptions.map(o => (
              <button
                key={o.price_tag ?? '(Unknown)'}
                type="button"
                onClick={() => toggleFrom(priceTags, o.price_tag ?? '(Unknown)', setPriceTags)}
                className={`border px-3 py-1 rounded text-sm ${priceTags.includes(o.price_tag ?? '(Unknown)') ? 'bg-black text-white' : ''}`}
                title={`${o.count} restaurants`}
              >
                {o.price_tag ?? '(Unknown)'}
              </button>
            ))}
          </div>
        </div>

        {/* Limit / Offset */}
        <div className="space-y-2">
          <label className="block text-sm">Limit</label>
          <input className="border p-2 w-full" type="number" min={1} max={100} value={limit} onChange={e=>setLimit(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Offset</label>
          <input className="border p-2 w-full" type="number" min={0} value={offset} onChange={e=>setOffset(Number(e.target.value))} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 items-end md:col-span-2">
          <button className="border px-3 py-2" onClick={runSearch} disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button
            className="border px-3 py-2"
            onClick={()=>{
              setMinRating(''); setMaxRating('')
              setCity(''); setActiveOnly(false); setRandom(false)
              setCuisinesAny([]); setCuisinesAll([]); setPriceTags([])
              setLimit(12); setOffset(0)
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm opacity-70">
        {error ? <span className="text-red-600">Error: {error}</span> : null}
        {!error && <span>Returned <b>{items.length}</b>{count !== null ? <> of <b>{count}</b></> : null} item(s).</span>}
      </div>

      {/* Results */}
      <ul className="space-y-2">
        {items.map(r => (
          <li key={r.id} className="border rounded p-3">
            <div className="font-medium">{r.name}</div>
            <div className="text-sm opacity-80">
              {r.parent_city ? `${r.parent_city} · ` : ''}
              {r.price_tag ? `${r.price_tag} · ` : ''}
              {r.avg_rating != null ? `⭐ ${r.avg_rating} (${r.review_count ?? 0})` : 'Unrated'}
              {r.cuisines?.length ? <> · {r.cuisines.join(', ')}</> : null}
              {r.is_active === false ? ' · (inactive)' : null}
            </div>
          </li>
        ))}
      </ul>

      {/* Debug: last request + raw items */}
      <details className="border rounded p-3">
        <summary className="cursor-pointer">Debug</summary>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify({ request: lastRequest, count, items }, null, 2)}</pre>
      </details>
    </div>
  )
}