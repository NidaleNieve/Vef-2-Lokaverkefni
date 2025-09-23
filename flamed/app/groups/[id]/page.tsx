// app/groups/[id]/page.tsx
import ChatRoom from './ChatRoom'

export default async function GroupPage(
  { params }: { params: Promise<{ id: string }> }   // 👈 note Promise here
) {
  const { id } = await params                         // 👈 await it
  return (
    <div className="h-[70vh] max-w-2xl mx-auto mt-6">
      <ChatRoom groupId={id} />
    </div>
  )
}
