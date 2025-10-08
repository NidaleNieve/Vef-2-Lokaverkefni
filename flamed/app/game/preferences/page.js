'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PreferencesPanel from '../../../components/preferences-panel';

export default function PreferencesPage() {
  const search = useSearchParams();
  const spGroupId = search.get('groupId') || '';
  const router = useRouter();
  const [groupId, setGroupId] = useState(spGroupId || '');
  const [inviteCode, setInviteCode] = useState('');

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
    if (!spGroupId) {
      const last = localStorage.getItem('lastGroupId') || '';
      if (last) setGroupId(last);
    }
  }, [spGroupId]);

  useEffect(() => {
    if (!groupId) return;
    // Try to load invite code from localStorage immediately for UI
    try {
      const lc = localStorage.getItem('activeGameInviteCode') || ''
      if (lc) setInviteCode(lc)
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

    // Also fetch latest invite code from server for this group (best-effort)
    ;(async () => {
      try {
        const r = await fetch(`/api/groups/${groupId}/invite`, { credentials: 'include', cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (r.ok && j?.invite?.code) {
          setInviteCode(String(j.invite.code))
          try { localStorage.setItem('activeGameInviteCode', String(j.invite.code)) } catch {}
        }
      } catch {}
    })()
  }, [groupId]);

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
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Hero */}
      <div className="rounded-2xl p-5 shadow-sm border animate-fade-in" style={{ background: 'linear-gradient(135deg, var(--nav-bg) 0%, var(--nav-item-bg) 100%)', borderColor: 'var(--nav-shadow)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--nav-text)' }}>Get ready to swipe</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Tune your preferences for this round.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip">Invite</span>
            <div className="px-3 py-1 rounded-full text-xs font-mono" style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--nav-shadow)' }}>{inviteCode || '—'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4 shadow-sm border" style={{ background: 'var(--nav-item-bg)', borderColor: 'var(--nav-shadow)' }}>
      <PreferencesPanel
        hostPrefs={hostPrefs}
        setHostPrefs={setHostPrefs}
        playerPrefs={playerPrefs}
        setPlayerPrefs={setPlayerPrefs}
        isHost={false}
        mode="personal"
      />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Start swiping
        </button>
      </div>
    </div>
  );
}