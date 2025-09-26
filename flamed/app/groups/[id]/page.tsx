// app/groups/[id]/page.tsx
export const dynamic = 'force-dynamic'
import RealtimeAuthBridge from '@/app/_realtime-auth-bridge'
import ChatRoom from './ChatRoom'

export default async function GroupPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params
  return (
    <>
      <RealtimeAuthBridge />
      <div className="h-[70vh] max-w-2xl mx-auto mt-6">
        <ChatRoom groupId={id} />
      </div>
    </>
  )
}
