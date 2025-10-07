// app/auth/signout/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LogOut, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'

export default function SignoutPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const onClick = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/auth/signout', { method: 'POST' })
      const json = await res.json()
      setResult(json)
    } catch (err: any) {
      setResult({ ok: false, error: err?.message || 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <LogOut className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign Out</h1>
              <p className="text-gray-600">Are you sure you want to sign out?</p>
            </div>
            
            <div className="space-y-4">
              <button
                disabled={loading}
                onClick={onClick}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
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
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Link>
            </div>
          </div>
          
          {result && (
            <div className={`px-8 py-4 ${result.ok ? 'bg-green-50' : 'bg-red-50'} transition-all duration-300`}>
              <div className={`flex items-start ${result.ok ? 'text-green-800' : 'text-red-800'}`}>
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
        
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>You can always sign back in anytime.</p>
        </div>
      </div>
    </div>
  )
}