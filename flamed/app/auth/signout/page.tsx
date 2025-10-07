
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LogOut, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'

// main signout component
export default function SignoutPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  // function runs when signout button is clicked
  const onClick = async () => {
    setLoading(true) // show loading spinner
    setResult(null) // clear old result
    try {
      // send signout request to api
      const res = await fetch('/api/auth/signout', { method: 'POST' })
      // get json response
      const json = await res.json()
      setResult(json)
    } catch (err: any) {
      // show error if request fails
      setResult({ ok: false, error: err?.message || 'request failed' })
    } finally {
      setLoading(false) // hide loading spinner
    }
  }
  // main return
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* main container for the signout card */}
      <div className="w-full max-w-md">
        {/* card with shadow and border */}
        <div className="rounded-2xl shadow-xl overflow-hidden border" style={{ 
          background: 'var(--background)',
          borderColor: 'var(--accent)',
          opacity: 0.8
        }}>
          <div className="px-8 py-6">
            {/* icon and title */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--nav-item-bg)' }}>
                  <LogOut className="h-8 w-8" style={{ color: 'var(--accent)' }} />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Sign out</h1>
              <p style={{ color: 'var(--muted)' }}>Are you sure you want to sign out?</p>
            </div>
            {/* signout and back buttons */}
            <div className="space-y-4">
              <button
                disabled={loading}
                onClick={onClick}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2"
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
                    Signing out...
                  </span>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </>
                )}
              </button>
              <Link 
                href="/auth/signin" 
                className="w-full flex justify-center items-center py-3 px-4 border rounded-lg shadow-sm text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ 
                  borderColor: 'var(--muted)',
                  backgroundColor: 'var(--nav-item-bg)',
                  color: 'var(--foreground)'
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Link>
            </div>
          </div>
          {/* result message for success or error */}
          {result && (
            <div className={`px-8 py-4 transition-all duration-300 ${
              result.ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className={`flex items-start ${
                result.ok ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
              }`}>
                <div className="flex-shrink-0 mt-0.5">
                  {result.ok ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3 overflow-hidden">
                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-40">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* info text below card */}
        <div className="mt-6 text-center text-xs" style={{ color: 'var(--muted)' }}>
          <p>you can always sign back in anytime.</p>
        </div>
      </div>
    </div>
  )
}