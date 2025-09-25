// app/groups/[id]/ChatRoom.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/utils/supabase/browser'

type Msg = {
  id:number; user_id:string; content:string; created_at:string; group_id?:string;
  author_alias?: string | null
}

export default function ChatRoom({ groupId }: { groupId: string }) {
  const supa = supabaseBrowser()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [alias, setAlias] = useState('')          // ← per-group alias
  const [defaultAlias, setDefaultAlias] = useState('') // ← from full_name
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Load saved alias; else default to auth.user_metadata.full_name
  useEffect(() => {
    const saved = localStorage.getItem(`alias:${groupId}`) || ''
    setAlias(saved)
    ;(async () => {
      const { data: { user } } = await supa.auth.getUser()
      const fallback = (user?.user_metadata as any)?.full_name || ''
      setDefaultAlias(fallback)
      if (!saved && fallback) {
        setAlias(fallback)
        localStorage.setItem(`alias:${groupId}`, fallback)
      }
    })()
  }, [groupId, supa])

  // Persist alias as the user types it
  useEffect(() => {
    localStorage.setItem(`alias:${groupId}`, alias.trim())
  }, [alias, groupId])

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supa
        .from('group_messages')
        .select('id,user_id,author_alias,content,created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!cancelled && !error) {
        setMsgs((data ?? []).reverse())
        requestAnimationFrame(() => {
          scrollerRef.current?.scrollTo(0, scrollerRef.current.scrollHeight)
        })
      }
    })()
    return () => { cancelled = true }
  }, [groupId, supa])

  // Check session before setting up realtime
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession()
      console.log('client session?', !!session, session?.user?.id)
    })()
  }, [supa])

  // Realtime (your unfiltered variant kept)
  useEffect(() => {
    const ch = supa
      .channel(`chat:${groupId}:unfiltered`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages' },
        (payload) => {
          const m = payload.new as Msg
          if (m.group_id === groupId) {
            setMsgs(prev => [...prev, m])
            requestAnimationFrame(() => scrollerRef.current?.scrollTo(0, scrollerRef.current.scrollHeight))
          }
        }
      )
      .subscribe()
    return () => { supa.removeChannel(ch) }
  }, [groupId, supa])

  async function send() {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: text, alias })   // ← send alias
    })
    if (!res.ok) {
      console.error('send error', await res.json().catch(()=>({})))
      return
    }
    setText('')
  }

  const header = (m: Msg) =>
    (m.author_alias && m.author_alias.trim()) || m.user_id.slice(0, 8)

  return (
    <div className="flex flex-col h-full border rounded">
      {/* Alias control bar */}
      <div className="px-3 py-2 border-b flex items-center gap-2 text-sm">
        <span className="opacity-70">Name shown in this group:</span>
        <input
          className="border rounded p-1 flex-1 max-w-xs"
          placeholder="Choose a name (optional)"
          value={alias}
          onChange={e=>setAlias(e.target.value)}
          maxLength={40}
        />
        <button
          className="border rounded px-2 py-1"
          onClick={() => setAlias(defaultAlias)}
          disabled={!defaultAlias}
          title="Use your sign-up name"
        >
          Use default
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {msgs.map(m => (
          <div key={m.id} className="text-sm">
            <div className="text-xs opacity-70 mb-0.5">
              {header(m)} · {new Date(m.created_at).toLocaleTimeString()}
            </div>
            <div>{m.content}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2 border-t">
        <input
          className="border rounded p-2 flex-1"
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="Type a message…"
        />
        <button className="border rounded px-3" onClick={send} disabled={!text.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
