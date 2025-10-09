
// this is the signup page for the app
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/utils/supabase/browser'


// main signup component
export default function SignupPage() {
  const router = useRouter()
  const supa = supabaseBrowser()
  const [checking, setChecking] = useState(true)
  // email input
  const [email, setEmail] = useState('')
  // password input
  const [password, setPassword] = useState('')
  // full name input
  const [fullName, setFullName] = useState('')
  // loading spinner
  const [loading, setLoading] = useState(false)
  // result message
  const [result, setResult] = useState<any>(null)
  // show or hide password
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already signed in (URL protection)
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supa.auth.getUser()
        if (user) {
          router.replace('/profile')
          return
        }
      } finally {
        setChecking(false)
      }
    })()
  }, [supa, router])


  // this function runs when the form is submitted
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // stop page from reloading
    setLoading(true) // show loading spinner
    setResult(null) // clear old result
    try {
      // send email, password, and full name to api
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      })
      // get json response
      const json = await res.json()
      setResult(json)
      if (json?.ok) {
        // redirect with inbox hint
        router.replace('/?checkInbox=1')
        return
      }
    } catch (err: any) {
      // show error if request fails
      setResult({ ok: false, error: err?.message || 'request failed' })
    } finally {
      setLoading(false) // hide loading spinner
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm opacity-70" style={{ color: 'var(--muted)' }}>Preparing sign up…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* main container for the form */}
      <div className="w-full max-w-md">
        {/* card with shadow and border */}
        <div className="rounded-2xl shadow-xl overflow-hidden border" style={{ 
          background: 'var(--background)',
          borderColor: 'var(--accent)',
          opacity: 0.8
        }}>
          <div className="px-8 py-6">
            {/* title and subtitle */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>create account</h1>
              <p style={{ color: 'var(--muted)' }}>sign up to get started with our service</p>
            </div>
            {/* form starts here */}
            <form onSubmit={onSubmit} className="space-y-5">
              {/* full name input */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                  </div>
                  <input
                    id="fullName"
                    className="block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition placeholder-gray-500"
                    style={{ 
                      borderColor: 'var(--muted)',
                      backgroundColor: 'var(--nav-item-bg)',
                      color: 'var(--foreground)'
                    }}
                    type="text"
                    placeholder="your full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
              {/* email input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                  </div>
                  <input
                    id="email"
                    className="block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition placeholder-gray-500"
                    style={{ 
                      borderColor: 'var(--muted)',
                      backgroundColor: 'var(--nav-item-bg)',
                      color: 'var(--foreground)'
                    }}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              {/* password input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                  </div>
                  <input
                    id="password"
                    className="block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition placeholder-gray-500"
                    style={{ 
                      borderColor: 'var(--muted)',
                      backgroundColor: 'var(--nav-item-bg)',
                      color: 'var(--foreground)'
                    }}
                    type={showPassword ? "text" : "password"}
                    placeholder="create a strong password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  {/* show/hide password button */}
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                    ) : (
                      <Eye className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  use at least 8 characters with a mix of letters, numbers & symbols
                </p>
              </div>
              {/* terms and privacy checkbox */}
              <div className="flex items-center text-sm">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  className="h-4 w-4 rounded border focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--nav-item-bg)',
                    borderColor: 'var(--muted)',
                    color: 'var(--accent)'
                  }}
                  required
                />
                <label htmlFor="terms" className="ml-2 block" style={{ color: 'var(--foreground)' }}>
                  i agree to the{' '}
                  <Link href="/terms" className="transition-colors" style={{ color: 'var(--accent)' }}>
                    terms of service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="transition-colors" style={{ color: 'var(--accent)' }}>
                    privacy policy
                  </Link>
                </label>
              </div>
              {/* sign up button */}
              <button
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ 
                  backgroundColor: 'var(--accent)'
                }}
              >
                {loading ? (
                  <span className="flex items-center">
                    {/* loading spinner */}
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    creating account...
                  </span>
                ) : (
                  'sign up'
                )}
              </button>
            </form>
            {/* already have account link */}
            <div className="mt-6 text-center text-sm">
              <span style={{ color: 'var(--muted)' }}>already have an account?</span>{' '}
              <Link 
                className="font-medium transition-colors" 
                style={{ color: 'var(--accent)' }}
                href="/auth/signin"
              >
                sign in
              </Link>
            </div>
          </div>
          {/* result error only */}
          {result && !result.ok && (
            <div className="px-8 py-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5" />
                <div className="text-sm">{result.error || 'Sign up failed'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}