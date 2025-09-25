// app/api/groups/[id]/messages/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supa = await serverClient()
  const { data, error } = await supa
    .from('group_messages')
    .select('id,user_id,author_alias,content,created_at') // ← include alias
    .eq('group_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content, alias } = await req.json()
  const supa = await serverClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cleanContent = String(content ?? '').trim()
  if (!cleanContent) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const cleanAlias =
    typeof alias === 'string' && alias.trim() ? alias.trim().slice(0, 40) : null

  const { error } = await supa.from('group_messages').insert({
    group_id: id,
    user_id: user.id,
    author_alias: cleanAlias,          // ← save alias
    content: cleanContent,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}