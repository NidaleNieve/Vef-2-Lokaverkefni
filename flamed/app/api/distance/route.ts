export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { origin, destinations, mode = 'walking', useTraffic = false } = await req.json()
  if (!origin || !destinations?.length) return NextResponse.json({ error: 'origin + destinations required' }, { status: 400 })

  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 })

  const originStr = `${origin.lat},${origin.lng}`
  const destStr   = destinations.map((d:any) => `${d.lat},${d.lng}`).join('|')

  const params = new URLSearchParams({
    origins: originStr,
    destinations: destStr,
    mode,
    units: 'metric',
    key,
  })
  if (mode === 'driving' && useTraffic) {
    params.set('departure_time', 'now')
    params.set('traffic_model', 'best_guess')
  }

  const r = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`)
  const j = await r.json()
  if (j.status !== 'OK') return NextResponse.json({ error: j.error_message || j.status }, { status: 400 })

  const els = j.rows?.[0]?.elements ?? []
  const results = destinations.map((d:any, i:number) => ({
    id: d.id ?? null,
    distance_text: els[i]?.distance?.text ?? null,
    distance_m:    els[i]?.distance?.value ?? null,
    duration_text: els[i]?.duration?.text ?? null,
    duration_s:    els[i]?.duration?.value ?? null,
    duration_in_traffic_text: els[i]?.duration_in_traffic?.text ?? null,
    status:        els[i]?.status ?? null,
  }))
  return NextResponse.json({ mode, results })
}