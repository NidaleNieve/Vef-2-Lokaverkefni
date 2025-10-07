// app/groups/[id]/ChatRoom.tsx

'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabaseBrowser } from '@/utils/supabase/browser'
import { Send, User, ArrowDown, MessageCircle, Edit, Check } from 'lucide-react'

type Msg = {
  id:number; user_id:string; content:string; created_at:string; group_id?:string;
  author_alias?: string | null
}

export default function ChatRoom({ groupId }: { groupId: string }) {
  const supa = useMemo(() => supabaseBrowser(), []) // stable client
  const [rtReady, setRtReady] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [alias, setAlias] = useState('')          //  per-group alias
  const [defaultAlias, setDefaultAlias] = useState('') //  from full_name
  const [currentUserId, setCurrentUserId] = useState<string | null>(null) //  track current user
  const [isEditingAlias, setIsEditingAlias] = useState(false) //  for alias editing
  const scrollerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  // scroll to bottom function
  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    setUnread(0)
  }

  // DUMMY AVATAR SYSTEM - TODO: Replace with real avatar system from make front for profile branch
  // This generates random colors based on user ID as placeholder avatars
  // Will be replaced with actual avatar images when avatar branch is merged
  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500'
    ]
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  const header = (m: Msg) =>
    (m.author_alias && m.author_alias.trim()) || m.user_id.slice(0, 8)

  return (
    <div className="flex flex-col h-full rounded-2xl shadow-2xl overflow-hidden" style={{ 
      background: 'var(--nav-bg)',
      borderColor: 'var(--accent)',
      border: '2px solid'
    }}>
      {/* Header with alias control */}
      <div className="px-6 py-4 flex items-center justify-between border-b" style={{ 
        background: 'linear-gradient(135deg, var(--nav-bg) 0%, var(--nav-item-bg) 100%)',
        borderColor: 'var(--accent)'
      }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full" style={{ background: 'var(--accent)' }}>
            <MessageCircle size={20} color="white" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--nav-text)' }}>Group Chat</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {msgs.length} message{msgs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Alias control */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Your name:</span>
          {isEditingAlias ? (
            <div className="flex items-center gap-2">
              <input
                className="px-3 py-1 rounded-lg border text-sm w-32"
                style={{ 
                  background: 'var(--background)',
                  borderColor: 'var(--accent)',
                  color: 'var(--nav-text)'
                }}
                placeholder="Your name"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                maxLength={40}
                autoFocus
              />
              <button
                className="p-1 rounded transition-colors hover:bg-green-100"
                onClick={() => setIsEditingAlias(false)}
                title="Save name"
              >
                <Check size={16} style={{ color: 'var(--accent)' }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-sm font-medium" style={{ 
                background: 'var(--nav-item-bg)',
                color: 'var(--nav-text)'
              }}>
                {alias || 'Anonymous'}
              </span>
              <button
                className="p-1 rounded transition-colors hover:bg-gray-100"
                onClick={() => setIsEditingAlias(true)}
                title="Edit name"
              >
                <Edit size={16} style={{ color: 'var(--muted)' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollerRef} className="relative flex-1 overflow-y-auto p-4 space-y-4" style={{ 
        background: 'var(--background)'
      }}>
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full mb-4" style={{ background: 'var(--nav-item-bg)' }}>
              <MessageCircle size={48} style={{ color: 'var(--muted)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--nav-text)' }}>
              No messages yet
            </h3>
            <p style={{ color: 'var(--muted)' }}>
              Start the conversation by sending the first message!
            </p>
          </div>
        ) : (
          msgs.map(m => {
            const isOwnMessage = m.user_id === currentUserId
            return (
              <div key={m.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* DUMMY Avatar - TODO: Replace with real avatars from avatar branch */}
                {/* Currently showing colored circles with first letter as placeholder */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getAvatarColor(m.user_id)}`}>
                  {header(m).charAt(0).toUpperCase()}
                </div>

                {/* Message bubble */}
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 py-2 rounded-2xl shadow-sm ${
                    isOwnMessage 
                      ? 'rounded-br-md' 
                      : 'rounded-bl-md'
                  }`} style={{ 
                    background: isOwnMessage ? 'var(--accent)' : 'var(--nav-item-bg)',
                    color: isOwnMessage ? 'white' : 'var(--nav-text)'
                  }}>
                    <p className="text-sm leading-relaxed">{m.content}</p>
                  </div>
                  
                  {/* Message info */}
                  <div className={`flex items-center gap-2 mt-1 text-xs ${
                    isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                  }`} style={{ color: 'var(--muted)' }}>
                    <span>{header(m)}</span>
                    <span>•</span>
                    <span>{new Date(m.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Sentinel for auto-scroll */}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <div className="absolute bottom-20 right-6">
          <button
            onClick={scrollToBottom}
            className="p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            style={{ 
              background: 'var(--accent)',
              color: 'white'
            }}
            title={unread > 0 ? `${unread} new message${unread !== 1 ? 's' : ''}` : 'Scroll to bottom'}
          >
            <ArrowDown size={20} />
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Message input area */}
      <div className="p-4 border-t" style={{ 
        background: 'var(--nav-bg)',
        borderColor: 'var(--accent)'
      }}>
        <form onSubmit={onSubmit} className="flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              className="w-full px-4 py-3 rounded-2xl border resize-none transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
              style={{ 
                background: 'var(--background)',
                borderColor: 'var(--accent)',
                color: 'var(--nav-text)',
                maxHeight: '120px'
              }}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              rows={1}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="p-3 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: text.trim() ? 'var(--accent)' : 'var(--nav-item-bg)',
              color: text.trim() ? 'white' : 'var(--muted)'
            }}
            disabled={!text.trim()}
            title="Send message"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  )
}
