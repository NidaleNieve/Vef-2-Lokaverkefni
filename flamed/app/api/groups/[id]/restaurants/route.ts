// app/api/groups/[id]/restaurants/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'
import { createRestaurantFilter } from '@/lib/restaurant-filters'

// Static mapping similar to frontend to expand blocked top-level categories -> subcuisines
const STATIC_CUISINE_GROUPS: Record<string, string[]> = {
  European: ['French','Italian','Spanish','Mediterranean','Central European','Eastern European','German','Polish','British','Irish','Scandinavian','Danish','Basque','Campania','Neapolitan','Southern-Italian'],
  Asian: ['Chinese','Japanese','Japanese Fusion','Thai','Korean','Vietnamese','Indian','Indonesian','Nepali','Pakistani','Szechuan','Tibetan'],
  American: ['American','South American','Argentinean','Latin'],
  MiddleEastern: ['Arabic','Turkish','Lebanese','Moroccan'],
  FastFood: ['Fast Food','Pizza','Street Food','Deli','Soups'],
  Seafood: ['Seafood'],
  GrillBarbecue: ['Grill','Barbecue','Steakhouse'],
  CafeBar: ['Cafe','Bar','Wine Bar','Brew Pub','Beer restaurants','Pub','Gastropub','Dining bars'],
  FusionContemporary: ['Fusion','Contemporary','International','Healthy'],
  Japanese_Sushi: ['Sushi'],
  Misc: [],
}

function expandBlockedToSubcuisines(blockedTop: string[]): string[] {
  const set = new Set<string>()
  for (const key of blockedTop || []) {
    const subs = STATIC_CUISINE_GROUPS[key] || []
    subs.forEach(s => set.add(s))
  }
  return Array.from(set)
}

// Map UI price tokens to backend tags
const PRICE_MAP: Record<string, string[]> = {
  '$': ['$'],
  '$$': ['$$ - $$$'],
  '$$$': ['$$ - $$$'],
  '$$$$': ['$$$$'],
}

function normalizePriceTags(tokens?: string[]): string[] {
  const out = new Set<string>()
  for (const t of Array.isArray(tokens) ? tokens : []) {
    const mapped = PRICE_MAP[t]
    if (mapped) mapped.forEach(x => out.add(x))
  }
  return Array.from(out)
}

async function getLatestHostPrefs(supa: any, groupId: string) {
  const { data, error } = await supa
    .from('group_messages')
    .select('content,created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return null
  for (const m of data || []) {
    try {
      const j = JSON.parse((m as any).content || '{}')
      if (j && j.type === 'host_prefs') return j.prefs || null
    } catch {}
  }
  return null
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supa = await serverClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const {
      player = {},
      useHostConstraints = true,
      sortBy = 'random',
      sortOrder = 'desc',
      limit = 30,
      offset = 0,
      city,
      includeUnknownPrice = false,
    } = body

    // Load latest host prefs from chat if requested
    const hostPrefs = useHostConstraints ? await getLatestHostPrefs(supa, id) : null

    // Derive price tags
    const playerPriceTokens: string[] = Array.isArray(player.price) ? player.price : []
    const playerPriceTags = normalizePriceTags(playerPriceTokens)

    // Apply host max price ceiling if provided
    let priceTags = playerPriceTags
    if (hostPrefs?.maxPrice) {
      const hostIdx = ['$', '$$', '$$$', '$$$$'].indexOf(hostPrefs.maxPrice)
      const allowed = ['$', '$$', '$$$', '$$$$'].slice(0, hostIdx >= 0 ? hostIdx + 1 : 4)
      const allowedTags = normalizePriceTags(allowed)
      priceTags = priceTags.length ? priceTags.filter(t => allowedTags.includes(t)) : allowedTags
    }

    // Cuisines: take player's chosen subcuisines; if none, we won't restrict by cuisines
    let cuisinesAny: string[] | undefined = Array.isArray(player.categories) ? player.categories : undefined

    // Enforce host blocked top-level groups by filtering out their subcuisines from player's selection
    if (hostPrefs?.blockedCategories && Array.isArray(cuisinesAny)) {
      const blockedSubs = expandBlockedToSubcuisines(hostPrefs.blockedCategories)
      cuisinesAny = cuisinesAny.filter(c => !blockedSubs.includes(c))
    }

    const builder = await createRestaurantFilter()
    const result = await builder
      .search(player.query)
      .city(city)
      .rating(player.minRating ? Number(player.minRating) : undefined, undefined)
      .cuisines(cuisinesAny, undefined)
      .price(priceTags, !!includeUnknownPrice)
      .activeOnly(true)
      .sort(sortBy, sortOrder)
      .paginate(limit, offset)
      .execute()

    return NextResponse.json({
      data: result.items,
      meta: {
        total: result.count,
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        hasMore: result.pagination.hasMore,
        applied: {
          player: {
            minRating: player.minRating ?? null,
            price: playerPriceTokens,
            cuisines: Array.isArray(player.categories) ? player.categories : [],
            city: city || null,
          },
          host: hostPrefs ? {
            maxPrice: hostPrefs.maxPrice ?? null,
            maxRadius: hostPrefs.maxRadius ?? null, // informational; not applied server-side
            blockedCategories: hostPrefs.blockedCategories || [],
          } : null,
          effective: {
            priceTags,
            cuisinesAny,
          }
        }
      }
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('Group restaurants search error:', error)
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 400 })
  }
}
