// app/profile/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/utils/supabase/browser'
import { User as UserIcon, LogOut, Users, Check, X } from 'lucide-react'

export default function ProfilePage() {
  const supa = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supa.auth.getUser()
        setUserId(user?.id ?? null)
        setEmail(user?.email ?? '')
        const name = (user?.user_metadata as any)?.full_name || ''
        setFullName(name)
      } finally {
        setLoading(false)
      }
    })()
  }, [supa])

  async function saveProfile() {
    try {
      setSaving(true)
      setError(null)
      const { error } = await supa.auth.updateUser({ data: { full_name: fullName.trim() } })
      if (error) throw error
      setEditing(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
      await supa.auth.signOut()
      window.location.href = '/'
    } catch {}
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-24">
        <div className="h-40 rounded-2xl" style={{ background: 'var(--nav-item-bg)' }} />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-24 text-center space-y-4">
        <UserIcon size={40} className="mx-auto" style={{ color: 'var(--muted)' }} />
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>You are not signed in</h1>
        <div className="flex justify-center gap-3">
          <Link href="/auth/signin" className="px-4 py-2 rounded-lg nav-item hover:shadow-sm">Sign in</Link>
          <Link href="/auth/signup" className="px-4 py-2 rounded-lg" style={{ background: 'var(--accent)', color: 'white' }}>Create account</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 mt-24">
      <div className="rounded-2xl shadow-lg overflow-hidden" style={{ background: 'var(--nav-item-bg)', border: '1px solid var(--nav-shadow)' }}>
        <div className="p-6 flex items-center gap-4 border-b" style={{ borderColor: 'var(--nav-shadow)', background: 'linear-gradient(135deg, var(--nav-bg) 0%, var(--nav-item-bg) 100%)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold" style={{ background: 'var(--accent)' }}>
            {((fullName || email).charAt(0) || '?').toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--nav-text)' }}>Your Profile</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Manage your account and preferences</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="px-4 py-2 rounded" style={{ background: 'var(--nav-item-hover)', color: 'var(--nav-text)', border: '1px solid var(--accent)' }}>{error}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm" style={{ color: 'var(--muted)' }}>Email</label>
              <input disabled value={email} className="w-full px-3 py-2 rounded-lg border" style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--muted)' }} />
            </div>
            <div className="space-y-1">
              <label className="text-sm" style={{ color: 'var(--muted)' }}>Display name</label>
              <div className="flex gap-2 items-center">
                <input 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={!editing}
                  placeholder="Your name"
                  className="flex-1 px-3 py-2 rounded-lg border transition-all duration-200 focus:ring-2"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', borderColor: editing ? 'var(--accent)' : 'var(--muted)' }}
                />
                {editing ? (
                  <>
                    <button onClick={saveProfile} disabled={saving} className="p-2 rounded-lg" style={{ background: 'var(--accent)', color: 'white', opacity: saving ? 0.7 : 1 }} title="Save">
                      <Check size={18} />
                    </button>
                    <button onClick={() => { setEditing(false); }} className="p-2 rounded-lg nav-item" title="Cancel">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-lg nav-item">Edit</button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/groups" className="px-4 py-2 rounded-lg nav-item flex items-center gap-2">
              <Users size={18} />
              My groups
            </Link>
            <button onClick={signOut} className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ background: 'var(--accent)', color: 'white' }}>
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
