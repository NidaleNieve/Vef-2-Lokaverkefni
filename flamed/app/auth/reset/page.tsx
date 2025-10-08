'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/utils/supabase/browser'

export default function ResetPasswordPage() {
  const supa = supabaseBrowser()
  const search = useSearchParams()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null)
  const [ready, setReady] = useState(false)

  // Supabase sends user to this page with access_token in URL. The Auth helpers on the client will pick it up.
  useEffect(() => {
    // Nothing to do explicitly; the session is set by the redirect. We can attempt a lightweight check.
    ;(async () => {
      try { await supa.auth.getUser() } catch {}
      setReady(true)
    })()
  }, [supa])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    if (password.length < 8) { setStatus({ ok:false, message:'Password must be at least 8 characters' }); return }
    if (password !== confirm) { setStatus({ ok:false, message:'Passwords do not match' }); return }
    try {
      const { error } = await supa.auth.updateUser({ password })
      if (error) throw error
      setStatus({ ok: true, message: 'Password updated. Redirecting to sign in…' })
      setTimeout(() => router.push('/auth/signin'), 1500)
    } catch (err: any) {
      setStatus({ ok:false, message: err?.message || 'Failed to update password' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-xl overflow-hidden border" style={{ background: 'var(--background)', borderColor: 'var(--accent)', opacity: 0.9 }}>
          <div className="px-8 py-6">
            <h1 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--foreground)' }}>Reset your password</h1>
            <p className="text-center text-sm mb-6" style={{ color: 'var(--muted)' }}>Enter a new password for your account.</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg border"
                  style={{ background: 'var(--nav-item-bg)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e=>setConfirm(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg border"
                  style={{ background: 'var(--nav-item-bg)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button className="w-full px-4 py-3 rounded-lg font-semibold" style={{ background: 'var(--accent)', color: 'white' }}>
                Update password
              </button>
            </form>
            {status && (
              <div className={`mt-4 p-3 rounded ${status.ok ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200'}`}>
                {status.message}
              </div>
            )}
            <div className="mt-6 text-center text-sm">
              <Link href="/auth/signin" className="underline" style={{ color: 'var(--accent)' }}>Back to sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
