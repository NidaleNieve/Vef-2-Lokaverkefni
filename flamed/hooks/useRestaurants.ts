// hooks/useRestaurants.ts - Enhanced unified hook
import { useState, useEffect, useMemo } from 'react'
import type { RestaurantFilters, RestaurantResponse } from '@/lib/restaurant-filters'

interface UseRestaurantsOptions {
  filters?: RestaurantFilters
  enabled?: boolean
  refetchOnMount?: boolean
}

interface UseRestaurantsReturn {
  data: RestaurantResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
  setFilters: (filters: RestaurantFilters) => void
}

export function useRestaurants(options: UseRestaurantsOptions = {}): UseRestaurantsReturn {
  const { filters: initialFilters = {}, enabled = true, refetchOnMount = true } = options
  
  const [data, setData] = useState<RestaurantResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<RestaurantFilters>(initialFilters)

  const fetchRestaurants = async (currentFilters: RestaurantFilters) => {
    if (!enabled) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          filters: currentFilters,
          pagination: {
            limit: currentFilters.limit,
            offset: currentFilters.offset
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch restaurants')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => {
    fetchRestaurants(filters)
  }

  // Fetch when filters change or on mount
  useEffect(() => {
    let mounted = true
    
    const fetchData = async () => {
      if (!enabled) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            filters,
            pagination: {
              limit: filters.limit,
              offset: filters.offset
            }
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
        
        const result = await response.json()
        if (mounted) {
          setData(result)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to fetch restaurants')
          setData(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    if (enabled && (refetchOnMount || Object.keys(filters).length > 0)) {
      fetchData()
    }
    
    return () => { mounted = false }
  }, [filters, enabled, refetchOnMount])

  return {
    data,
    loading,
    error,
    refetch,
    setFilters
  }
}

// Specialized hooks for common use cases
export function useTopRatedRestaurants(limit = 20) {
  return useRestaurants({
    filters: {
      minRating: 4.0,
      activeOnly: true,
      sortBy: 'rating',
      sortOrder: 'desc',
      limit
    }
  })
}

export function useRestaurantsByLocation(city: string, limit = 50) {
  return useRestaurants({
    filters: {
      city,
      activeOnly: true,
      sortBy: 'rating',
      sortOrder: 'desc',
      limit
    },
    enabled: Boolean(city)
  })
}

export function useRestaurantSearch(searchTerm: string, additionalFilters: Partial<RestaurantFilters> = {}) {
  return useRestaurants({
    filters: {
      nameSearch: searchTerm,
      activeOnly: true,
      sortBy: 'rating',
      sortOrder: 'desc',
      limit: 50,
      ...additionalFilters
    },
    enabled: Boolean(searchTerm?.trim())
  })
}