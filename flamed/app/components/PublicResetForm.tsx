'use client'
import { useState } from 'react'

export default function PublicResetForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include', // fine even if not logged in
    })
    setMsg('If an account exists for that email, a reset link was sent.')
    setLoading(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm">
      <h2 className="font-semibold">Forgot your password?</h2>
      <input
        className="border p-2 w-full"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <button
        type="submit"
        className="border px-3 py-2"
        disabled={loading || !email}
      >
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
      {msg && <p className="text-xs opacity-70">{msg}</p>}
    </form>
  )
}