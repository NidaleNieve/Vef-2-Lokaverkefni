// app/chat/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/utils/supabase/browser'
import { MessageCircle, Users } from 'lucide-react'

type MyGroup = { group_id: string; group_name: string; role: string }

export default function ChatLanding() {
  const router = useRouter()
  const supa = supabaseBrowser()
  const [groups, setGroups] = useState<MyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supa.auth.getUser()
        if (!user) {
          setAuthed(false)
          setLoading(false)
          return
        }
        setAuthed(true)
        const last = typeof window !== 'undefined' ? localStorage.getItem('lastGroupId') : null
        if (last) {
          router.replace(`/groups/${last}`)
          return
        }
        const { data, error } = await supa.rpc('get_my_groups')
        if (error) throw error
        const arr = Array.isArray(data) ? (data as MyGroup[]) : []
        setGroups(arr)
        if (arr.length > 0) {
          router.replace(`/groups/${arr[0].group_id}`)
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    })()
  }, [router, supa])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-24">
        <div className="h-32 rounded-2xl" style={{ background: 'var(--nav-item-bg)' }} />
      </div>
    )
  }

  if (authed === false) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-24 text-center space-y-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Chat</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          To use chat you must sign in or create an account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signin" className="px-5 py-3 rounded-lg nav-item font-medium">Sign In</Link>
          <Link href="/auth/signup" className="px-5 py-3 rounded-lg nav-item font-medium">Create Account</Link>
        </div>
        <p className="text-xs opacity-70" style={{ color: 'var(--muted)' }}>Group messaging and results require an account.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 mt-24">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--accent)' }}>
          <MessageCircle size={22} color="white" />
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>Choose a group to chat</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>You are not in any group chat yet.</p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center">
          <Link href="/groups" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg nav-item">
            <Users size={18} />
            Go to My Groups
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map(g => (
            <Link key={g.group_id} href={`/groups/${g.group_id}`} className="p-4 rounded-lg nav-item flex items-center justify-between hover:shadow-sm">
              <span className="font-medium">{g.group_name}</span>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{g.role}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
