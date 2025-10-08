// app/auth/update-password/page.tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import { supabaseBrowser } from '@/utils/supabase/browser'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const supa = supabaseBrowser()
  const router = useRouter()
  const [status, setStatus] = useState<'checking'|'ready'|'done'|'error'>('checking')
  const [error, setError] = useState<string | null>(null)
  const pw1Ref = useRef<HTMLInputElement>(null)
  const pw2Ref = useRef<HTMLInputElement>(null)

  // React to auth state changes (PASSWORD_RECOVERY event)
  useEffect(() => {
    const { data: sub } = supa.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
        setError(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [supa])

  // Ensure we have a recovery session (the email link sets it)
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supa.auth.getSession()
      // When coming from the email link, session should be present (PASSWORD_RECOVERY)
      setStatus(session ? 'ready' : 'error')
      if (!session) setError('Recovery link invalid or expired. Request a new one.')
    })()
  }, [supa])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const p1 = pw1Ref.current?.value ?? ''
    const p2 = pw2Ref.current?.value ?? ''
    if (p1.length < 8) return setError('Password must be at least 8 characters.')
    if (p1 !== p2) return setError('Passwords do not match.')

    const { error } = await supa.auth.updateUser({ password: p1 })
    if (error) {
      setStatus('error'); setError(error.message); return
    }
    setStatus('done')
    // redirect to sign-in after a moment
    setTimeout(() => router.push('/dev'), 1200)
  }

  if (status === 'checking') return <p>Loading…</p>
  if (status === 'error') return <p className="text-red-600">{error}</p>
  if (status === 'done') return <p className="text-green-700">Password updated! You can now sign in.</p>

  return (
    <form onSubmit={submit} className="max-w-md p-4 space-y-3">
      <h1 className="font-semibold text-lg">Set a new password</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input ref={pw1Ref} type="password" className="border p-2 w-full" placeholder="New password" />
      <input ref={pw2Ref} type="password" className="border p-2 w-full" placeholder="Confirm password" />
      <button type="submit" className="border px-3 py-2">Update password</button>
    </form>
  )
}