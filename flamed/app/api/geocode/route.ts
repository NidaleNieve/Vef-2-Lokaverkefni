import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { Client } from '@googlemaps/google-maps-services-js'

type RestaurantRow = {
	id: string
	name: string | null
	parent_city: string | null
}

const client = new Client({})

// Simple concurrency limiter
async function mapWithConcurrency<I, O>(items: I[], limit: number, fn: (item: I, index: number) => Promise<O>): Promise<O[]> {
	const results: O[] = []
	let i = 0
	const workers: Promise<void>[] = []
	const run = async () => {
		while (i < items.length) {
			const idx = i++
			results[idx] = await fn(items[idx], idx)
		}
	}
	for (let c = 0; c < Math.min(limit, items.length); c++) workers.push(run())
	await Promise.all(workers)
	return results
}

export async function GET(req: NextRequest) {
	try {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY
		if (!apiKey) {
			return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 })
		}

		const { searchParams } = new URL(req.url)
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
		const offset = parseInt(searchParams.get('offset') || '0', 10)
		const onlyActive = (searchParams.get('active') || 'true') === 'true'
		const id = searchParams.get('id')

		// Fetch rows from Supabase
		let query = supabase
			.from('restaurants')
			.select('id,name,parent_city')
			.order('id', { ascending: true })

		if (onlyActive) query = query.eq('is_active', true)
		if (id) query = query.eq('id', id)
		else query = query.range(offset, offset + limit - 1)

		const { data, error } = await query

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 })
		}

		const rows: RestaurantRow[] = data || []
		if (!rows.length) {
			return NextResponse.json({ items: [], count: 0 })
		}

		const items = await mapWithConcurrency(rows, 5, async (row) => {
			const name = row.name?.trim()
			const city = row.parent_city?.trim()
			if (!name || !city) {
				return { id: row.id, name: row.name, parent_city: row.parent_city, status: 'skipped:missing_fields' }
			}
			const address = `${name}, ${city}`
			try {
				const resp = await client.geocode({ params: { address, key: apiKey } })
				const best = resp.data.results?.[0]
				if (!best) {
					return { id: row.id, name, parent_city: city, status: 'no_results' }
				}
				const loc = best.geometry?.location
				return {
					id: row.id,
					name,
					parent_city: city,
					formatted_address: best.formatted_address,
					place_id: best.place_id,
					lat: loc?.lat ?? null,
					lng: loc?.lng ?? null,
					status: 'ok'
				}
			} catch (e: any) {
				return { id: row.id, name, parent_city: city, status: 'error', error: e?.message || String(e) }
			}
		})

		return NextResponse.json({ items, count: items.length })
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
	}
}

