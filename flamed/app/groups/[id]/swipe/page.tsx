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
				// Persist active game info for global UI (navbar pill, smart logo)
				try {
					localStorage.setItem('activeGameGroupId', groupId)
					if (j?.invite?.code) localStorage.setItem('activeGameInviteCode', String(j.invite.code))
				} catch {}
			} catch {}
		})()
	}, [groupId])

	return (
		<div className="max-w-xl mx-auto p-4 space-y-4">
			{/* Game-like HUD */}
			<div className="rounded-2xl p-4 shadow-sm border animate-fade-in" style={{ background: 'var(--nav-item-bg)', borderColor: 'var(--nav-shadow)' }}>
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Swipe Showdown</h2>
					{/* Group display removed as requested */}
				</div>
				<div className="mt-2 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="chip">Invite</span>
						<span className="px-2 py-1 rounded-full text-xs font-mono" style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--nav-shadow)' }}>{inviteCode || '—'}</span>
					</div>
					{inviteCode && (
						<button
							onClick={async () => { try { await navigator.clipboard.writeText(inviteCode) } catch {} }}
							className="nav-item px-3 py-1 rounded-lg text-xs"
						>
							Copy code
						</button>
					)}
				</div>
			</div>

			{/* Swiper component consumes groupId and prefs */}
			<Swiper
				groupId={groupId}
				hostPreferences={hostPrefs}
				playerPreferences={playerPrefs}
			/>
		</div>
	)
}

