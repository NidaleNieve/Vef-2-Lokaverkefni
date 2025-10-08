'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/utils/supabase/browser'

export default function ForgotPasswordPage() {
  const supa = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<null | { ok: boolean; message: string }>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const redirectTo = `${window.location.origin}/auth/reset`
      const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setMsg({ ok: true, message: 'Reset email sent. Check your inbox.' })
    } catch (err: any) {
      setMsg({ ok: false, message: err?.message || 'Failed to send reset email' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-xl overflow-hidden border" style={{ background: 'var(--background)', borderColor: 'var(--accent)', opacity: 0.9 }}>
          <div className="px-8 py-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Forgot password</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>We will email you a link to reset it.</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e=>setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-3 rounded-lg border"
                  style={{ background: 'var(--nav-item-bg)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                  placeholder="you@example.com"
                />
              </div>
              <button disabled={loading} className="w-full px-4 py-3 rounded-lg font-semibold disabled:opacity-70" style={{ background: 'var(--accent)', color: 'white' }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            {msg && (
              <div className={`mt-4 p-3 rounded ${msg.ok ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200'}`}>
                {msg.message}
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
