'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function GroupPreferencesPage() {
  const router = useRouter()
  const params = useParams()
  
  useEffect(() => {
    // Redirect to the game preferences page with group ID
    const groupId = params?.id
    if (groupId) {
      router.replace(`/game/preferences?groupId=${groupId}`)
    } else {
      router.replace('/groups')
    }
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted">Redirecting...</p>
      </div>
    </div>
  )
}
