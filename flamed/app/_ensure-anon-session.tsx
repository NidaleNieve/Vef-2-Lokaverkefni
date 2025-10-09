// app/_ensure-anon-session.tsx
'use client'
import { useEffect } from 'react'
import { supabaseBrowser } from '@/utils/supabase/browser'

export default function EnsureAnonSession() {
  const supa = supabaseBrowser()

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const { data: { session } } = await supa.auth.getSession()

        // If there is no session at all, create an anonymous one
        if (!session) {
          const { error } = await supa.auth.signInAnonymously()
          if (error) {
            // Non-blocking: you can log/alert
            console.warn('Anonymous sign-in failed:', error.message)
          }
        }
      } catch (err) {
        // swallow errors to avoid breaking the app; log for visibility
        console.warn('EnsureAnonSession error:', err)
      }
    })()

    // Keep realtime auth in sync: clear on sign-out to avoid stale tokens
    const { data: listener } = supa.auth.onAuthStateChange((_event, session) => {
      try {
        if (session?.access_token) {
          supa.realtime.setAuth(session.access_token)
        } else {
          // clear auth when session is removed
          supa.realtime.setAuth(null)
        }
      } catch (e) {
        // non-blocking
        console.warn('realtime setAuth failed', e)
      }
    })

    return () => {
      mounted = false
      try {
        if (listener?.subscription) listener.subscription.unsubscribe()
      } catch (e) {
        // ignore
      }
    }
  }, [supa])

  return null
}
