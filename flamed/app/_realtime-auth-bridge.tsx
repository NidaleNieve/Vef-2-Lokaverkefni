// app/_realtime-auth-bridge.tsx
'use client'
import { useEffect } from 'react'
import { supabaseBrowser } from '@/utils/supabase/browser'

export default function RealtimeAuthBridge() {
  const supa = supabaseBrowser()
  useEffect(() => {
    supa.auth.getSession().then(({ data:{ session } }) => {
      if (session?.access_token) supa.realtime.setAuth(session.access_token)
    })
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) supa.realtime.setAuth(session.access_token)
    })
    return () => sub.subscription.unsubscribe()
  }, [supa])
  return null
}