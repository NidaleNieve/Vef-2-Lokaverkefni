// lib/services/restaurants.ts
import { serverClient } from "@/utils/supabase/server";

export async function getRandomRestaurants(limit: number) {
    const supa = await serverClient()
    console.log('Service: calling RPC with p_limit:', limit)
    
    // Debug: Check if we have a valid client
    console.log('Service: Server client created successfully')
    
    const { data, error } = await supa.rpc('get_random_restaurants', { p_limit: limit })
    
    console.log('Service: Raw RPC response - data:', data, 'error:', error)
    
    if (error) {
        console.error('Service: RPC error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
        throw new Error(error.message)
    }
    
    console.log('Service: RPC returned data type:', typeof data, 'length:', Array.isArray(data) ? data.length : 'not array')
    console.log('Service: RPC returned data:', data)
    return data ?? []
}