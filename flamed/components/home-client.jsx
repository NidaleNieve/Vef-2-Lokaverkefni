'use client'

import { useEffect, useState } from 'react'
import Swiper from './swiper'
import PreferencesPanel from './preferences-panel'


//þetta er temp skjal sem renderar allt á swipe síðunni. Það leyfir manni að starta leik og að swipa
export default function HomeClient() {
  const [groupInput, setGroupInput] = useState('')
  const [groupId, setGroupId] = useState('')
  const [isHost, setIsHost] = useState(false) // gate host-only controls
  const [readyToSwipe, setReadyToSwipe] = useState(false) // require confirm before swiping
  
  // Prefences states
  const [hostPrefs, setHostPrefs] = useState({
    requireKidFriendly: false,
    maxRadius: '',
    blockedCategories: [],
  })
  const [playerPrefs, setPlayerPrefs] = useState({
    radius: '',
    rating: '',
    price: '',
    kidFriendly: false,
    allergies: '',
    categories: [],
  })

  //sækir groupId úr local storage, qol feature
  useEffect(() => {
    const last = localStorage.getItem('lastGroupId') || ''
    if (last) {
      setGroupInput(last)
      setGroupId(last)
      setIsHost(false)
      setReadyToSwipe(false)
    }
  }, [])

  //geymir groupId í localstorage þegar það breytist
  useEffect(() => {
    if (groupId) localStorage.setItem('lastGroupId', groupId)
  }, [groupId])

  //Þetta function býr til nýjan leik útfrá groupId sem er sett inn. Keyrir þegar create game takkinn er ýttur
  async function startRound() {
    //ef að groupID er rétt, þá geri ég request á 'round' routið sem býr til nýjan leik 
    if (!groupInput.trim()) return
    const res = await fetch(`/api/groups/${groupInput.trim()}/round`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
    })
    //error handling
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(j?.error || `Failed to start round (${res.status})`)
      return
    }
    //geymi groupId
    const gid = groupInput.trim()
    setGroupId(gid)
    setIsHost(true)
    setReadyToSwipe(false)
  }

  //temp html
  //swiper tekur inn groupid, sem joinar game ef að það er til
  return (
    <div className="w-full max-w-xl">
      <h1 className="text-4xl font-bold mb-4">Restaurants</h1>
      <div className="mb-6 flex gap-2 items-center">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Enter group id (uuid)"
          value={groupInput}
          onChange={e => setGroupInput(e.target.value)}
        />
        <button
          className="border rounded px-3 py-2"
          onClick={() => {
            setGroupId(groupInput.trim())
            setIsHost(false)
            setReadyToSwipe(false)
          }}
          disabled={!groupInput.trim()}
        >
          Join
        </button>
        <button
          className="border rounded px-3 py-2"
          onClick={startRound}
          disabled={!groupInput.trim()}
        >
          Create Game
        </button>
      </div>

      {/* Preference Panel */}
      <PreferencesPanel
        hostPrefs={hostPrefs}
        setHostPrefs={setHostPrefs}
        playerPrefs={playerPrefs}
        setPlayerPrefs={setPlayerPrefs}
        isHost={isHost}
      />
      {/* Require explicit confirmation before showing Swiper */}
      {!readyToSwipe ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Set your preferences, then start swiping.
          </p>
          <button
            className="border rounded px-3 py-2"
            onClick={() => setReadyToSwipe(true)}
            disabled={!groupId}
            title={groupId ? 'Start swiping' : 'Join or create a group first'}
          >
            Start swiping
          </button>
        </div>
      ) : (
        <Swiper
          groupId={groupId || undefined}
          hostPreferences={hostPrefs}
          playerPreferences={playerPrefs}
        />
      )}
    </div>
  )
}