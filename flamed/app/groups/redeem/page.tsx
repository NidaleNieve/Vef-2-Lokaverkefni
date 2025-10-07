// app/groups/redeem/page.tsx
'use client'
import { useState } from 'react'

export default function RedeemPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/groups/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const json = await res.json()
      setResult(json)
    } catch (err: any) {
      setResult({ error: err?.message || 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Redeem invite</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border p-2 w-full"
          type="text"
          placeholder="Enter invite code"
          value={code}
          onChange={e=>setCode(e.target.value)}
          required
        />
        <button disabled={loading} className="border px-3 py-2 w-full">
          {loading ? 'Redeeming…' : 'Redeem'}
        </button>
      </form>
      {result && (
        <pre className="text-xs whitespace-pre-wrap border p-2 bg-white/40">
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
