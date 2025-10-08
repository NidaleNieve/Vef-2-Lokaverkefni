'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PreferencesPanel from '../../../components/preferences-panel';

export default function PreferencesPage() {
  const search = useSearchParams();
  const spGroupId = search.get('groupId') || '';
  const router = useRouter();
  const [groupId, setGroupId] = useState(spGroupId || '');

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
    <div className="max-w-xl mx-auto p-4 space-y-6">
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

      <div className="mb-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
        Group: <span className="font-mono">{groupId || '(none)'}</span>
      </div>

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