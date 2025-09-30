// app/dev/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/utils/supabase/browser'

type MyGroup = {
  group_id: string
  group_name: string
  role: string
  joined_at?: string
  group_created_at?: string
}

export default function Dev() {
  const supa = supabaseBrowser()
  const [email, setEmail] = useState('user1@example.com')
  const [password, setPassword] = useState('Password123!')
  const [fullName, setFullName] = useState('Dev User')

  const [groupId, setGroupId] = useState<string>('')
  const [inviteCode, setInviteCode] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('Renamed Group')

  const [groups, setGroups] = useState<MyGroup[]>([])
  const [log, setLog] = useState<string[]>([])
  const logit = (x: any) => setLog(l => [`> ${JSON.stringify(x)}`, ...l])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supa.auth.getUser()
      setUserId(user?.id ?? null)
      if (user?.email) setEmail(user.email) // prefill with session email
    })()
  }, [supa])

  const fetchJSON = async (url: string, init?: RequestInit) => {
    const r = await fetch(url, { credentials: 'include', ...init })
    const body = await r.json().catch(() => ({}))
    const payload = { status: r.status, ...body }
    logit(payload)
    return { r, body: payload }
  }

  async function verifyMembership(gid: string) {
    if (!gid) return
    // RLS: this returns only YOUR membership row (if it exists)
    const { data, error } = await supa
      .from('group_members')
      .select('group_id, user_id, role, joined_at')
      .eq('group_id', gid)
      .limit(1)
    logit({ verifyMembership: { error: error?.message, rows: data?.length ?? 0, data } })
  }

  // Load groups for current user and populate dropdown
  async function loadMyGroups() {
    // Preferred: get_my_groups() (no args)
    let { data, error } = await supa.rpc('get_my_groups')

    if (error) {
      logit({ get_my_groups_error: error.message })
      setGroups([])
      return
    }
    const arr = Array.isArray(data) ? (data as MyGroup[]) : []
    setGroups(arr)
    logit({ get_my_groups_count: arr.length })
    // If no current group selected, default to first
    if (!groupId && arr.length) setGroupId(arr[0].group_id)
  }

  // After creating a group or redeeming an invite, refresh groups
  async function refreshGroupsIfPossible() {
    if (userId) await loadMyGroups()
  }

  // send password reset email
  async function sendResetLink() {
    const { data: { user } } = await supa.auth.getUser()
    if (!user?.email) { logit({ resetPasswordForEmail: 'no session email' }); return }
    const origin = window.location.origin
    const { error } = await supa.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${origin}/auth/update-password`,
    })
    logit({ resetPasswordForEmail: error ? error.message : 'sent' })
  }

  return (
    <div className="p-4 space-y-4 max-w-lg">
      <h1 className="font-semibold text-lg">Dev Console</h1>

      <p className="text-xs opacity-70">
        userId: {userId || '(not signed in)'}<br />
        groupId: {groupId || '(none)'}
      </p>

      {/* Load groups and select group */}
      <div className="space-y-2">
        <button className="border px-3 py-2" onClick={loadMyGroups}>
          Load my groups
        </button>

        {groups.length > 0 && (
          <select
            className="border p-2"
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            title="Select a group"
          >
            {groups.map(g => (
              <option key={g.group_id} value={g.group_id}>
                {g.group_name} ({g.role})
              </option>
            ))}
          </select>
        )}

        {groupId && (
          <div className="flex gap-2 items-center">
            <Link
              href={`/groups/${groupId}`}
              className="border px-3 py-2 rounded"
            >
              Open chat for this group
            </Link>

            <Link
              href={`/groups/${groupId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border px-3 py-2 rounded"
            >
              Open in new tab
            </Link>

            <button
              className="border px-3 py-2 rounded"
              onClick={async () => {
                const url = `${window.location.origin}/groups/${groupId}`
                await navigator.clipboard.writeText(url)
                // optional: log so you can see it in the dev console panel
                // @ts-ignore
                if (typeof logit === 'function') logit({ copied: url })
              }}
            >
              Copy chat URL
            </button>
          </div>
        )}
      </div>

      {/* Rename group */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <input
            className="border p-2 flex-1"
            placeholder="new group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button
            className="border px-3 py-2"
            disabled={!groupId || newGroupName.trim().length < 2}
            onClick={async () => {
              const name = newGroupName.trim()
              // RPC path (recommended): calls SQL function rename_group()
              const { data, error } = await supa.rpc('rename_group', {
                p_group_id: groupId,
                p_new_name: name,
              })
              logit({ rename_group_rpc: { data, error: error?.message } })
              if (!error) {
                await loadMyGroups()        // refresh dropdown to see new name
              }
            }}
          >
            Rename (RPC)
          </button>
        </div>
        <p className="text-xs opacity-70">
          You must be an <em>admin/owner</em> of the selected group to rename it.
        </p>
      </div>

      {/* Auth */}
      <div className="space-y-2">
        <input className="border p-2 w-full" placeholder="email"
               value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border p-2 w-full" placeholder="password" type="password"
               value={password} onChange={e=>setPassword(e.target.value)} />
        <input className="border p-2 w-full" placeholder="full name"
               value={fullName} onChange={e=>setFullName(e.target.value)} />

        <div className="flex gap-2 flex-wrap">
          <button className="border px-3 py-2" onClick={async()=>{
            const { body } = await fetchJSON('/api/auth/signup', {
              method:'POST',
              headers:{'content-type':'application/json'},
              body: JSON.stringify({ email, password, full_name: fullName })
            })
            if (body?.ok) {
              const u = await supa.auth.getUser()
              setUserId(u.data.user?.id ?? null)
            }
          }}>Sign up</button>

          <button className="border px-3 py-2" onClick={async()=>{
            const { body } = await fetchJSON('/api/auth/signin', {
              method:'POST',
              headers:{'content-type':'application/json'},
              body: JSON.stringify({ email, password })
            })
            if (body?.ok) {
              const u = await supa.auth.getUser()
              setUserId(u.data.user?.id ?? null)
            }
          }}>Sign in</button>

          <button className="border px-3 py-2" onClick={async()=>{
            await fetchJSON('/api/auth/signout', { method:'POST' })
            setUserId(null); setGroupId('')
          }}>Sign out</button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="border px-3 py-2"
            onClick={sendResetLink}
            disabled={!userId}
            title="Sends a password reset email"
          >
            Send reset link
          </button>

          <Link
            href="/auth/update-password"
            className="border px-3 py-2 rounded"
            title="Page the email link will land on"
          >
            Go to &apos;Update password&apos; page
          </Link>
        </div>

        <div className="pt-2">
          <Link className="underline" href="/forgot-password">Forgot password?</Link>
        </div>
      </div>

      {/* Groups & Invites */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button className="border px-3 py-2" onClick={async()=>{
            const { body } = await fetchJSON('/api/groups', {
              method:'POST',
              headers:{'content-type':'application/json'},
              body: JSON.stringify({ name: 'My Group' })
            })
            if (typeof body?.group_id === 'string') {
              setGroupId(body.group_id)
              await verifyMembership(body.group_id)
            }
          }}>Create group</button>

          <button className="border px-3 py-2" disabled={!groupId} onClick={async()=>{
            const { body } = await fetchJSON(`/api/groups/${groupId}/invites`, {
              method:'POST',
              headers:{'content-type':'application/json'},
              body: JSON.stringify({ max_uses: 5 })
            })
            if (typeof body?.code === 'string') setInviteCode(body.code)
          }}>Create invite</button>
        </div>

        <input className="border p-2 w-full" placeholder="invite code"
               value={inviteCode} onChange={e=>setInviteCode(e.target.value)} />

        {/* Server route redeem */}
        <div className="flex gap-2 flex-wrap">
          <button className="border px-3 py-2" onClick={async()=>{
            const code = inviteCode.trim()
            const { body } = await fetchJSON('/api/groups/redeem', {
              method:'POST',
              headers:{'content-type':'application/json'},
              body: JSON.stringify({ code })
            })
            if (typeof body?.group_id === 'string') {
              setGroupId(body.group_id)
              await verifyMembership(body.group_id)
            }
          }}>
            Redeem invite (server)
          </button>

          {/* Client-side RPC (debug fallback) */}
          <button className="border px-3 py-2" onClick={async()=>{
            const code = inviteCode.trim()
            const { data, error } = await supa.rpc('redeem_group_invite', { p_code: code })
            logit({ clientRPC: { data, error: error?.message } })
            if (typeof data === 'string') {
              setGroupId(data)
              await verifyMembership(data)
            }
          }}>
            Redeem invite (client RPC)
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <input className="border p-2 w-full" placeholder="message content"
               value={content} onChange={e=>setContent(e.target.value)} />

        <div className="flex gap-2 flex-wrap">
          <button className="border px-3 py-2"
                  disabled={!groupId || !content.trim()}
                  onClick={async()=>{
                    if (!groupId) { logit({ error:'No groupId set' }); return }
                    await fetchJSON(`/api/groups/${groupId}/messages`, {
                      method:'POST',
                      headers:{'content-type':'application/json'},
                      body: JSON.stringify({ content })
                    })
                    setContent('')
                  }}>
            Send message
          </button>

          <button className="border px-3 py-2"
                  disabled={!groupId}
                  onClick={async()=>{
                    if (!groupId) { logit({ error:'No groupId set' }); return }
                    await fetchJSON(`/api/groups/${groupId}/messages`)
                  }}>
            List messages
          </button>
        </div>
      </div>

      <pre className="text-xs whitespace-pre-wrap border p-2 max-h-80 overflow-auto">
        {log.join('\n')}
      </pre>
    </div>
  )
}