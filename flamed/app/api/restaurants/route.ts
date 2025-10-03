// app/api/restaurants/route.ts - New unified endpoint
import { NextResponse } from 'next/server'
import { createRestaurantFilter, type RestaurantFilters } from '@/lib/restaurant-filters'

// GET /api/restaurants - Simple filtering via query params
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const filters: RestaurantFilters = {
      minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
      maxRating: searchParams.get('maxRating') ? Number(searchParams.get('maxRating')) : undefined,
      city: searchParams.get('city') || undefined,
      nameSearch: searchParams.get('search') || undefined,
      activeOnly: searchParams.get('activeOnly') !== 'false',
      sortBy: (searchParams.get('sortBy') as any) || 'rating',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
    }
    
    // Handle array parameters
    const cuisinesAny = searchParams.getAll('cuisineAny')
    const cuisinesAll = searchParams.getAll('cuisineAll')
    const priceTags = searchParams.getAll('priceTag')
    
    if (cuisinesAny.length > 0) filters.cuisinesAny = cuisinesAny
    if (cuisinesAll.length > 0) filters.cuisinesAll = cuisinesAll
    if (priceTags.length > 0) filters.priceTags = priceTags
    
    const filterBuilder = await createRestaurantFilter()
    const result = await filterBuilder
      .rating(filters.minRating, filters.maxRating)
      .city(filters.city)
      .cuisines(filters.cuisinesAny, filters.cuisinesAll)
      .price(filters.priceTags, filters.includeUnknownPrice)
      .search(filters.nameSearch)
      .activeOnly(filters.activeOnly)
      .sort(filters.sortBy, filters.sortOrder)
      .paginate(filters.limit, filters.offset)
      .execute()
    
    return NextResponse.json({
      data: result.items,
      meta: {
        total: result.count,
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        hasMore: result.pagination.hasMore
      },
      filters: result.filters
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
    
  } catch (error: any) {
    console.error('Restaurant filter error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch restaurants',
        code: 'RESTAURANT_FETCH_ERROR'
      },
      { status: 400 }
    )
  }
}

// POST /api/restaurants - Complex filtering via request body
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { filters = {}, pagination = {} } = body
    
    const filterBuilder = await createRestaurantFilter()
    const result = await filterBuilder
      .rating(filters.minRating, filters.maxRating)
      .city(filters.city)
      .cuisines(filters.cuisinesAny, filters.cuisinesAll)
      .price(filters.priceTags, filters.includeUnknownPrice)
      .search(filters.nameSearch)
      .activeOnly(filters.activeOnly ?? true)
      .sort(filters.sortBy, filters.sortOrder)
      .paginate(pagination.limit, pagination.offset)
      .execute()
    
    return NextResponse.json({
      data: result.items,
      meta: {
        total: result.count,
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        hasMore: result.pagination.hasMore
      },
      filters: result.filters
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
    
  } catch (error: any) {
    console.error('Restaurant filter error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch restaurants',
        code: 'RESTAURANT_FETCH_ERROR'
      },
      { status: 400 }
    )
  }
}