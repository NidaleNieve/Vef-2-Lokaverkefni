"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Swiper from '@/components/swiper'

type HostPrefs = {
	requireKidFriendly?: boolean
	maxRadius?: string
	maxPrice?: '$' | '$$' | '$$$' | '$$$$'
	blockedCategories: string[]
}

type PlayerPrefs = {
	radius?: string
	rating?: string
	price?: string[] | string
	kidFriendly?: boolean
	allergies?: string
	categories: string[]
}

export default function GroupSwipePage() {
	const params = useParams() as { id?: string }
	const groupId = params?.id || ''

	const [hostPrefs, setHostPrefs] = useState<HostPrefs>({
		requireKidFriendly: false,
		maxRadius: '',
		blockedCategories: [],
	})
	const [playerPrefs, setPlayerPrefs] = useState<PlayerPrefs>({
		radius: '',
		rating: '',
		price: [],
		kidFriendly: false,
		allergies: '',
		categories: [],
	})
	const [inviteCode, setInviteCode] = useState<string>('')

	// Load saved prefs for this group (and best-effort host prefs from chat)
	useEffect(() => {
		if (!groupId) return
		try {
			const hp = localStorage.getItem(`hostPrefs:${groupId}`)
			if (hp) setHostPrefs(prev => ({ ...prev, ...JSON.parse(hp) }))
		} catch {}
		try {
			const pp = localStorage.getItem(`playerPrefs:${groupId}`)
			if (pp) setPlayerPrefs(prev => ({ ...prev, ...JSON.parse(pp) }))
		} catch {}

		;(async () => {
			try {
				// fetch latest host_prefs from chat
				const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' })
				const j = await res.json().catch(() => ({}))
				if (res.ok && Array.isArray(j?.items)) {
					for (const m of j.items) {
						try {
							const c = JSON.parse(m.content || '{}')
							if (c && c.type === 'host_prefs' && c.prefs) {
								setHostPrefs(prev => ({
									...prev,
									requireKidFriendly: !!c.prefs.requireKidFriendly,
									maxRadius: c.prefs.maxRadius ?? '',
									maxPrice: c.prefs.maxPrice,
									blockedCategories: Array.isArray(c.prefs.blockedCategories) ? c.prefs.blockedCategories : [],
								}))
								break
							}
						} catch {}
					}
				}
			} catch {}
		})()
	}, [groupId])

	// Fetch a recent invite code so others can join mid-game
	useEffect(() => {
		if (!groupId) return
		;(async () => {
			try {
				const r = await fetch(`/api/groups/${groupId}/invite`, { credentials: 'include', cache: 'no-store' })
				const j = await r.json().catch(() => ({}))
				if (r.ok && j?.invite?.code) setInviteCode(String(j.invite.code))
			} catch {}
		})()
	}, [groupId])

	return (
		<div className="max-w-xl mx-auto p-4 space-y-3">
			<div className="flex items-center justify-between text-sm opacity-80">
				<div>Group: <span className="font-mono">{groupId || '(none)'}</span></div>
				<div>Invite: <span className="font-mono">{inviteCode || '—'}</span></div>
			</div>

			{/* Existing Swiper component consumes groupId and prefs */}
			<Swiper
				groupId={groupId}
				hostPreferences={hostPrefs}
				playerPreferences={playerPrefs}
			/>
		</div>
	)
}

