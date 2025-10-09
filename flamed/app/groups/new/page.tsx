'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewGroupPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to groups page - new group creation happens there
    router.replace('/groups')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted">Redirecting...</p>
      </div>
    </div>
  )
}
