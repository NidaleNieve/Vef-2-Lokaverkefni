"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PreferencesPanel from '../../../components/preferences-panel';

export default function PreferencesPage() {
  const router = useRouter();
  const [groupId, setGroupId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [hostPrefs, setHostPrefs] = useState({
    requireKidFriendly: false,
    maxRadius: '',
    blockedCategories: [],
  });

  const [playerPrefs, setPlayerPrefs] = useState({
    radius: '',
    rating: '',
    price: '',
    kidFriendly: false,
    allergies: '',
    categories: [],
  });

  useEffect(() => {
    // Read groupId from URL on client-side to avoid useSearchParams prerender bailout
    try {
      const params = new URLSearchParams(window.location.search || '')
      const g = params.get('groupId') || localStorage.getItem('lastGroupId') || ''
      if (g) setGroupId(g)
    } catch (e) {
      const last = localStorage.getItem('lastGroupId') || '';
      if (last) setGroupId(last);
    }
  }, []);

  useEffect(() => {
    if (!groupId) return;
    // Preload invite from localStorage so players can see it here too
    try {
      const cached = localStorage.getItem('activeGameInviteCode');
      if (cached) setInviteCode(String(cached));
    } catch {}
    const savedHost = localStorage.getItem(`hostPrefs:${groupId}`);
    if (savedHost) {
      try {
        setHostPrefs(JSON.parse(savedHost));
      } catch {}
    }
    const savedPlayer = localStorage.getItem(`playerPrefs:${groupId}`);
    if (savedPlayer) {
      try {
        setPlayerPrefs(JSON.parse(savedPlayer));
      } catch {}
    }
    // Best-effort: fetch latest host preferences from group chat
    (async () => {
      try {
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
                  blockedCategories: Array.isArray(c.prefs.blockedCategories) ? c.prefs.blockedCategories : [],
                }))
                break
              }
            } catch {}
          }
        }
      } catch {}
    })()

    // Also best-effort fetch of invite code so the badge is accurate
    ;(async () => {
      try {
        const r = await fetch(`/api/groups/${groupId}/invite`, { credentials: 'include', cache: 'no-store' })
        const jj = await r.json().catch(() => ({}))
        const code = jj?.invite?.code || jj?.code || ''
        if (r.ok && code) {
          setInviteCode(String(code))
          try { localStorage.setItem('activeGameInviteCode', String(code)) } catch {}
        }
      } catch {}
    })()
  }, [groupId]);

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

  const handleSave = () => {
    if (!groupId) {
      alert('Missing group id');
      return;
    }
    // Auto-select all subcategories for any expanded groups without choices
    // Note: the panel maintains categories; we simply ensure non-empty by leaving it as-is if user hasn't interacted.
    localStorage.setItem('lastGroupId', groupId);
    localStorage.setItem(`playerPrefs:${groupId}`, JSON.stringify(playerPrefs));
    // Redirect to swiping page that is already set up
    router.push(`/groups/${encodeURIComponent(groupId)}/swipe`);
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* invite card before header */}
      {inviteCode && (
       <div className="rounded-2xl p-4 max-w-sm shadow-lg border animate-fade-in mx-auto"
         style={{
         background: 'var(--nav-item-bg)',
           borderColor: 'var(--nav-shadow)',
           boxShadow: '0 8px 32px var(--nav-shadow)'
         }}>
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Invite Code Section - Smaller box */}
            <div className="w-full">
              <div className="flex items-center justify-center gap-2">
                <code className="px-2.5 py-1.5 rounded-md text-sm font-mono font-semibold tracking-wide border" style={{ 
                  background: 'var(--background)', 
                  color: 'var(--foreground)', 
                  borderColor: 'var(--accent)'
                }}>
                  {inviteCode || 'Loading...'}
                </code>
                {inviteCode && (
                  <button
                    onClick={handleCopyCode}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-out flex items-center gap-1.5 ${copyFeedback ? 'scale-95' : 'hover:scale-105 active:scale-95'}`}
                    style={{ 
                      background: copyFeedback ? 'var(--accent)' : 'var(--background)',
                      color: copyFeedback ? 'var(--background)' : 'var(--foreground)',
                      border: '1px solid var(--nav-shadow)'
                    }}
                    disabled={copyFeedback}
                  >
                    {copyFeedback ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              {inviteCode && (
                <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                  Share this code with friends to join your game
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Your Preferences
        </h1>
        <p className="text-sm px-4 py-2 rounded-full inline-block" style={{ 
          color: 'var(--muted)',
          backgroundColor: 'var(--nav-item-hover)'
        }}>
          Step 3 of 3: Set groups personal preferences
        </p>
      </div>


        {/*
      <div className="mb-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
        Group: <span className="font-mono">{groupId || '(none)'}</span>
      </div>
      */}

      <PreferencesPanel
        hostPrefs={hostPrefs}
        setHostPrefs={setHostPrefs}
        playerPrefs={playerPrefs}
        setPlayerPrefs={setPlayerPrefs}
        isHost={false}
        mode="personal"
      />

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg font-semibold"
          style={{ 
            backgroundColor: 'var(--accent)', 
            color: 'var(--nav-text)',
            boxShadow: '0 4px 14px 0 rgba(170, 96, 200, 0.3)',
            '--tw-ring-color': 'var(--accent)',
            '--tw-ring-offset-color': 'var(--background)'
          }}
        >
          Start Swiping!
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center animate-fade-in-up-delayed">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
        </div>
      </div>
    </div>
  );
}