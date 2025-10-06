// lib/restaurant-filters.ts
import { serverClient } from '@/utils/supabase/server'

// Centralized filter types
export type RestaurantFilters = {
  // Rating filters
  minRating?: number
  maxRating?: number
  
  // Location filters
  city?: string
  
  // Cuisine filters
  cuisinesAny?: string[]    // OR logic
  cuisinesAll?: string[]    // AND logic
  
  // Price filters
  priceTags?: string[]
  includeUnknownPrice?: boolean
  
  // Search filters
  nameSearch?: string
  
  // Status filters
  activeOnly?: boolean
  
  // Sorting & pagination
  sortBy?: 'rating' | 'reviews' | 'name' | 'random'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type RestaurantResponse = {
  items: Restaurant[]
  count: number
  filters: RestaurantFilters
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export type Restaurant = {
  id: string
  name: string
  avg_rating: number | null
  review_count: number | null
  price_tag: string | null
  parent_city: string | null
  cuisines: string[] | null
  is_active: boolean | null
}

// Validation utilities
export const filterValidation = {
  clamp: (n: number, min: number, max: number) => Math.min(max, Math.max(min, n)),
  
  validateRating: (rating: number | undefined) => {
    if (rating === undefined) return undefined
    return filterValidation.clamp(rating, 0, 5)
  },
  
  validateLimit: (limit: number | undefined) => {
    return filterValidation.clamp(limit || 50, 1, 100)
  },
  
  validateOffset: (offset: number | undefined) => {
    return Math.max(0, offset || 0)
  },
  
  validateCuisines: (cuisines: unknown) => {
    return Array.isArray(cuisines) ? cuisines.filter(c => typeof c === 'string') : []
  },
  
  validatePriceTags: (tags: unknown) => {
    const VALID_TAGS = new Set(['$', '$$ - $$$', '$$$$', '(Unknown)'])
    const array = Array.isArray(tags) ? tags : []
    return array.filter(tag => typeof tag === 'string' && VALID_TAGS.has(tag))
  }
}

// Core filter builder
export class RestaurantFilterBuilder {
  private supa: any
  private query: any
  private appliedFilters: RestaurantFilters = {}

  constructor(supabaseClient: any) {
    this.supa = supabaseClient
    this.query = this.supa
      .from('restaurants')
      .select('id,name,avg_rating,review_count,price_tag,parent_city,cuisines,is_active', { count: 'exact' })
  }

  // Apply filters method by method
  rating(min?: number, max?: number) {
    const minRating = filterValidation.validateRating(min)
    const maxRating = filterValidation.validateRating(max)
    
    if (minRating !== undefined) {
      this.query = this.query.gte('avg_rating', minRating)
      this.appliedFilters.minRating = minRating
    }
    
    if (maxRating !== undefined) {
      this.query = this.query.lte('avg_rating', maxRating)
      this.appliedFilters.maxRating = maxRating
    }
    
    if (minRating !== undefined || maxRating !== undefined) {
      this.query = this.query.not('avg_rating', 'is', null)
    }
    
    return this
  }

  city(cityName?: string) {
    if (cityName?.trim()) {
      this.query = this.query.ilike('parent_city', `%${cityName.trim()}%`)
      this.appliedFilters.city = cityName.trim()
    }
    return this
  }

  cuisines(any?: string[], all?: string[]) {
    const validAny = filterValidation.validateCuisines(any)
    const validAll = filterValidation.validateCuisines(all)
    
    if (validAny.length > 0) {
      this.query = this.query.overlaps('cuisines', validAny)
      this.appliedFilters.cuisinesAny = validAny
    }
    
    if (validAll.length > 0) {
      this.query = this.query.contains('cuisines', validAll)
      this.appliedFilters.cuisinesAll = validAll
    }
    
    return this
  }

  price(tags?: string[], includeUnknown = false) {
    const validTags = filterValidation.validatePriceTags(tags)
    
    if (includeUnknown && validTags.length > 0) {
      // Include both known tags and unknown/null prices
      const pgArray = `{${validTags.map(t => `"${t}"`).join(',')}}`
      this.query = this.query.or(`price_tag.is.null,price_tag.eq.,price_tag.in.${pgArray}`)
    } else if (includeUnknown && validTags.length === 0) {
      // Only unknown prices
      this.query = this.query.or('price_tag.is.null,price_tag.eq.')
    } else if (!includeUnknown && validTags.length > 0) {
      // Only specific price tags
      this.query = this.query.in('price_tag', validTags)
    }
    
    if (validTags.length > 0 || includeUnknown) {
      this.appliedFilters.priceTags = validTags
      this.appliedFilters.includeUnknownPrice = includeUnknown
    }
    
    return this
  }

  search(searchTerm?: string) {
    if (searchTerm?.trim()) {
      this.query = this.query.ilike('name', `%${searchTerm.trim()}%`)
      this.appliedFilters.nameSearch = searchTerm.trim()
    }
    return this
  }

  activeOnly(active = true) {
    if (active) {
      this.query = this.query.eq('is_active', true)
    }
    this.appliedFilters.activeOnly = active
    return this
  }

  sort(sortBy: RestaurantFilters['sortBy'] = 'rating', order: RestaurantFilters['sortOrder'] = 'desc') {
    this.appliedFilters.sortBy = sortBy
    this.appliedFilters.sortOrder = order
    
    if (sortBy === 'random') {
      // Random sorting handled in post-processing
      return this
    }
    
    const ascending = order === 'asc'
    
    switch (sortBy) {
      case 'rating':
        this.query = this.query
          .order('avg_rating', { ascending, nullsFirst: false })
          .order('review_count', { ascending: false, nullsFirst: false })
        break
      case 'reviews':
        this.query = this.query
          .order('review_count', { ascending, nullsFirst: false })
          .order('avg_rating', { ascending: false, nullsFirst: false })
        break
      case 'name':
        this.query = this.query.order('name', { ascending })
        break
    }
    
    return this
  }

  paginate(limit?: number, offset?: number) {
    const validLimit = filterValidation.validateLimit(limit)
    const validOffset = filterValidation.validateOffset(offset)
    
    this.appliedFilters.limit = validLimit
    this.appliedFilters.offset = validOffset
    
    // For random sorting, fetch more items then shuffle
    const fetchLimit = this.appliedFilters.sortBy === 'random' 
      ? Math.min(validLimit * 4, 400) 
      : validLimit
    
    this.query = this.query.range(validOffset, validOffset + fetchLimit - 1)
    
    return this
  }

  async execute(): Promise<RestaurantResponse> {
    const { data, error, count } = await this.query
    
    if (error) {
      throw new Error(error.message)
    }
    
    let items = data || []
    
    // Handle random sorting post-query
    if (this.appliedFilters.sortBy === 'random') {
      // Fisher-Yates shuffle
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[items[i], items[j]] = [items[j], items[i]]
      }
      items = items.slice(0, this.appliedFilters.limit || 50)
    }
    
    return {
      items,
      count: count || 0,
      filters: this.appliedFilters,
      pagination: {
        limit: this.appliedFilters.limit || 50,
        offset: this.appliedFilters.offset || 0,
        hasMore: (this.appliedFilters.offset || 0) + items.length < (count || 0)
      }
    }
  }
}

// Convenience function to create a new filter builder
export async function createRestaurantFilter() {
  const supa = await serverClient()
  return new RestaurantFilterBuilder(supa)
}