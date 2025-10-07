// app/groups/[id]/ChatRoom.tsx
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabaseBrowser } from '@/utils/supabase/browser'

type Msg = {
  id:number; user_id:string; content:string; created_at:string; group_id?:string;
  author_alias?: string | null
}

export default function ChatRoom({ groupId }: { groupId: string }) {
  const supa = useMemo(() => supabaseBrowser(), []) // stable client
  const [rtReady, setRtReady] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [alias, setAlias] = useState('')          // ← per-group alias
  const [defaultAlias, setDefaultAlias] = useState('') // ← from full_name
  const scrollerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // track if user is near the bottom (so we only autoscroll then)
  const [autoScroll, setAutoScroll] = useState(true)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const atBottom = distanceFromBottom < 64 // px threshold
      setAutoScroll(atBottom)
      if (atBottom) setUnread(0)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    // run once to initialize
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // after initial load, jump to bottom
  useEffect(() => {
    // call this after you set initial messages
    // (do this right after your initial fetch resolves)
    endRef.current?.scrollIntoView({ block: 'end' })
  }, []) // only once on mount

  // whenever a new message arrives, scroll if we're near bottom
  useEffect(() => {
    if (msgs.length === 0) return
    if (autoScroll) {
      // smooth for live updates
      endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    } else {
      // user is reading above; increment an unread counter
      setUnread(u => u + 1)
    }
  }, [msgs.length, autoScroll])

  const jumpToBottom = () => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }

  // authorize realtime socket, then flip ready
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data:{ session } } = await supa.auth.getSession()
      if (session?.access_token) supa.realtime.setAuth(session.access_token)
      else {
        const r = await fetch('/api/auth/session', { credentials:'include' }).catch(()=>null)
        const j = await r?.json().catch(()=>null)
        if (j?.access_token) supa.realtime.setAuth(j.access_token)
      }
      if (!cancelled) setRtReady(true)
    })()
    return () => { cancelled = true }
  }, [supa])

  // subscribe only after rtReady
  useEffect(() => {
    if (!rtReady) return

    // clean any stale channels (useful after HMR)
    supa.getChannels().forEach(ch => supa.removeChannel(ch))

    const ch = supa
      .channel(`chat:${groupId}:debug`)
      .on(
        'postgres_changes',
        { event:'INSERT', schema:'public', table:'group_messages' },
        (pl) => {
          console.log('RT payload:', pl)
          const m = pl.new as any
          if (m.group_id === groupId) {
            setMsgs(prev => [...prev, m])
            // The new auto-scroll logic will handle this via the msgs.length effect
          }
        }
      )
      .subscribe((status) => console.log('RT status:', status))

    return () => { supa.removeChannel(ch) }
  }, [rtReady, groupId, supa])

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
        // initial load uses the endRef scroll-to-bottom logic
        requestAnimationFrame(() => {
          endRef.current?.scrollIntoView({ block: 'end' })
        })
      }
    })()
    return () => { cancelled = true }
  }, [groupId, supa])

  async function send() {
    const content = text.trim()
    if (!content) return
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content, alias }) // keep whatever you already send
    })
    if (!res.ok) {
      console.error('send error', await res.json().catch(()=>({})))
      return
    }
    setText('')
    // keep cursor in the box
    inputRef.current?.focus()
  }

  // new: form submit handler
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    send()
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
      <div ref={scrollerRef} className="relative flex-1 overflow-y-auto p-3 space-y-3">
        {msgs.map(m => (
          <div key={m.id} className="text-sm">
            <div className="text-xs opacity-70 mb-0.5">
              {header(m)} · {new Date(m.created_at).toLocaleTimeString()}
            </div>
            <div>{m.content}</div>
          </div>
        ))}

        {/* sentinel */}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-3 flex gap-2 border-t">
        <input
          ref={inputRef}
          className="border rounded p-2 flex-1"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
        />
        <button
          type="submit"                // important: submit the form
          className="border rounded px-3"
          disabled={!text.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}
