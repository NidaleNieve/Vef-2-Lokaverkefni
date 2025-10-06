// app/api/restaurants/search/route.ts - RESTful search endpoint
import { NextResponse } from 'next/server'
import { createRestaurantFilter } from '@/lib/restaurant-filters'

// GET /api/restaurants/search?q=pizza&city=reykjavik&limit=20
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const query = searchParams.get('q')
    if (!query?.trim()) {
      return NextResponse.json(
        { 
          error: 'Search query is required',
          code: 'MISSING_SEARCH_QUERY' 
        },
        { status: 422 }
      )
    }

    const filterBuilder = await createRestaurantFilter()
    const result = await filterBuilder
      .search(query.trim())
      .city(searchParams.get('city') || undefined)
      .rating(
        searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
        searchParams.get('maxRating') ? Number(searchParams.get('maxRating')) : undefined
      )
      .activeOnly(searchParams.get('activeOnly') !== 'false')
      .sort('rating', 'desc')
      .paginate(
        searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
        searchParams.get('offset') ? Number(searchParams.get('offset')) : 0
      )
      .execute()

    return NextResponse.json({
      data: result.items,
      meta: {
        total: result.count,
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        hasMore: result.pagination.hasMore,
        query: query.trim()
      },
      filters: result.filters
    }, {
      headers: { 
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    })

  } catch (error: any) {
    console.error('Restaurant search error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Search failed',
        code: 'SEARCH_ERROR'
      },
      { status: 400 }
    )
  }
}

// POST /api/restaurants/search - Complex search with filters
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { query, filters = {}, pagination = {} } = body

    if (!query?.trim()) {
      return NextResponse.json(
        { 
          error: 'Search query is required',
          code: 'MISSING_SEARCH_QUERY' 
        },
        { status: 422 }
      )
    }

    const filterBuilder = await createRestaurantFilter()
    const result = await filterBuilder
      .search(query.trim())
      .rating(filters.minRating, filters.maxRating)
      .city(filters.city)
      .cuisines(filters.cuisinesAny, filters.cuisinesAll)
      .price(filters.priceTags, filters.includeUnknownPrice)
      .activeOnly(filters.activeOnly ?? true)
      .sort(filters.sortBy || 'rating', filters.sortOrder || 'desc')
      .paginate(pagination.limit, pagination.offset)
      .execute()

    return NextResponse.json({
      data: result.items,
      meta: {
        total: result.count,
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        hasMore: result.pagination.hasMore,
        query: query.trim()
      },
      filters: result.filters
    }, {
      headers: { 
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    })

  } catch (error: any) {
    console.error('Restaurant search error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Search failed',
        code: 'SEARCH_ERROR'
      },
      { status: 400 }
    )
  }
}