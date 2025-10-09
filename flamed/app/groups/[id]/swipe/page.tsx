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
	const [isLoading, setIsLoading] = useState(true)
	const [copyFeedback, setCopyFeedback] = useState(false)

	// Show loading feedback
	useEffect(() => {
		if (groupId) {
			const timer = setTimeout(() => setIsLoading(false), 500)
			return () => clearTimeout(timer)
		}
	}, [groupId])

	// Load saved prefs for this group (and best-effort host prefs from chat)
	useEffect(() => {
		if (!groupId) return
		
		let cancelled = false
		
		const loadPreferences = async () => {
			try {
				// Load from localStorage first for immediate UI
				const hp = localStorage.getItem(`hostPrefs:${groupId}`)
				if (hp && !cancelled) setHostPrefs(prev => ({ ...prev, ...JSON.parse(hp) }))
			} catch {}
			
			try {
				const pp = localStorage.getItem(`playerPrefs:${groupId}`)
				if (pp && !cancelled) setPlayerPrefs(prev => ({ ...prev, ...JSON.parse(pp) }))
			} catch {}

			// Fetch latest host_prefs from chat
			try {
				const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' })
				const j = await res.json().catch(() => ({}))
				if (!cancelled && res.ok && Array.isArray(j?.items)) {
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
		}

		loadPreferences()
		return () => { cancelled = true }
	}, [groupId])

	// Fetch a recent invite code so others can join mid-game
	useEffect(() => {
		if (!groupId) return
		
		let cancelled = false

		// Pre-populate from localStorage for immediate UI before server fetch
		try {
			const cached = localStorage.getItem('activeGameInviteCode')
			if (cached && !cancelled) setInviteCode(String(cached))
		} catch {}
		
		const fetchInviteCode = async () => {
			try {
				const r = await fetch(`/api/groups/${groupId}/invite`, { credentials: 'include', cache: 'no-store' })
				const j = await r.json().catch(() => ({}))
				if (!cancelled && r.ok && j?.invite?.code) {
					setInviteCode(String(j.invite.code))
				}
				// Persist active game info for global UI (navbar pill, smart logo)
				try {
					localStorage.setItem('activeGameGroupId', groupId)
					// record creation time for active game visibility logic
					try { localStorage.setItem('activeGameCreatedAt', new Date().toISOString()) } catch {}
					if (j?.invite?.code) localStorage.setItem('activeGameInviteCode', String(j.invite.code))
				} catch {}
			} catch {}
		}

		fetchInviteCode()
		return () => { cancelled = true }
	}, [groupId])

	const handleCopyCode = async () => {
		if (!inviteCode) return
		
		try {
			await navigator.clipboard.writeText(inviteCode)
			setCopyFeedback(true)
			setTimeout(() => setCopyFeedback(false), 2000)
		} catch (error) {
			// Fallback for older browsers
			const textArea = document.createElement('textarea')
			textArea.value = inviteCode
			document.body.appendChild(textArea)
			textArea.select()
			document.execCommand('copy')
			document.body.removeChild(textArea)
			setCopyFeedback(true)
			setTimeout(() => setCopyFeedback(false), 2000)
		}
	}

	if (isLoading) {
		return (
			<div className="max-w-xl mx-auto p-4 space-y-4">
				<div className="rounded-2xl p-6 shadow-sm border animate-pulse" style={{ background: 'var(--nav-item-bg)', borderColor: 'var(--nav-shadow)' }}>
					<div className="flex items-center justify-between">
						<div className="h-6 bg-var(--muted) rounded w-1/3 opacity-20"></div>
						<div className="h-8 bg-var(--muted) rounded w-20 opacity-20"></div>
					</div>
				</div>
				<div className="flex items-center justify-center min-h-96">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-var(--accent)"></div>
				</div>
			</div>
		)
	}

	return (
		<div className="max-w-2xl mx-auto p-4 space-y-6">
			{/* Game-like HUD */}
			<div className="rounded-2xl p-6 shadow-lg border animate-fade-in" style={{ 
				background: 'var(--nav-item-bg)', 
				borderColor: 'var(--nav-shadow)',
				boxShadow: '0 8px 32px var(--nav-shadow)'
			}}>
				<div className="flex flex-col items-center gap-4 text-center">
					{/* Invite Code Section - More Prominent */}
					<div className="w-full">
						<h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
							Invite Friends to Game
						</h2>
						<div className="flex items-center justify-center gap-3">
							<code className="px-4 py-3 rounded-xl text-lg font-mono font-bold tracking-wider border-2" style={{ 
								background: 'var(--background)', 
								color: 'var(--foreground)', 
								borderColor: 'var(--accent)',
								boxShadow: '0 4px 12px var(--nav-shadow)'
							}}>
								{inviteCode || 'Loading...'}
							</code>
							
							{inviteCode && (
								<button
									onClick={handleCopyCode}
									className={`px-5 py-3 rounded-xl font-medium transition-all duration-200 ease-out flex items-center gap-2 ${
										copyFeedback 
											? 'scale-95' 
											: 'hover:scale-105 active:scale-95'
									}`}
									style={{ 
										background: copyFeedback ? 'var(--accent)' : 'var(--background)',
										color: copyFeedback ? 'var(--background)' : 'var(--foreground)',
										border: '2px solid var(--nav-shadow)',
										boxShadow: '0 4px 12px var(--nav-shadow)'
									}}
									disabled={copyFeedback}
								>
									{copyFeedback ? (
										<>
											<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
											Copied!
										</>
									) : (
										<>
											<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
											</svg>
											Copy
										</>
									)}
								</button>
							)}
						</div>
						{inviteCode && (
							<p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>
								Share this code with friends to join your game
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Swiper component consumes groupId and prefs */}
			<div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
				<Swiper
					groupId={groupId}
					hostPreferences={hostPrefs}
					playerPreferences={playerPrefs}
				/>
			</div>
		</div>
	)
}