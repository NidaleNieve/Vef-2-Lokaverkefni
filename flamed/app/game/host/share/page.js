"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HostSharePage() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [hostPrefs, setHostPrefs] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Load pending prefs saved by host page
    const saved = localStorage.getItem('hostPrefs:pending');
    if (saved) {
      try { setHostPrefs(JSON.parse(saved)); } catch {}
    }
  }, []);

  async function loadGroups() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups', { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed to load groups (${res.status})`);
      const arr = Array.isArray(j?.data) ? j.data : [];
      setGroups(arr);
      if (!selectedGroupId && arr.length) setSelectedGroupId(arr[0].id);
    } catch (e) {
      setError(e?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  async function createGroup() {
    const name = newGroupName.trim();
    if (name.length < 2) { alert('Group name must be at least 2 characters'); return; }
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { alert(j?.error || `Failed to create group (${res.status})`); return; }
    const id = j?.data?.id;
    if (id) {
      setSelectedGroupId(id);
      localStorage.setItem('lastGroupId', id);
      await loadGroups();
    }
  }

  async function createInvite() {
    if (!selectedGroupId) { alert('Pick a group first'); return; }
    const res = await fetch(`/api/groups/${selectedGroupId}/invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ max_uses: 10 })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { alert(j?.error || `Failed to create invite (${res.status})`); return; }
    const code = j?.code || ''
    setInviteCode(code);
    try {
      if (code) localStorage.setItem('activeGameInviteCode', String(code))
      if (selectedGroupId) localStorage.setItem('activeGameGroupId', String(selectedGroupId))
    } catch {}
  }

  async function startRoundAndAnnounce() {
    if (!selectedGroupId) { alert('Pick a group first'); return; }
    if (!inviteCode) { alert('Generate an invite code before starting'); return }
    setStarting(true);
    try {
      // Persist host prefs under the selected group as well
      if (hostPrefs) localStorage.setItem(`hostPrefs:${selectedGroupId}`, JSON.stringify(hostPrefs));
      localStorage.setItem('lastGroupId', selectedGroupId);
      try { localStorage.setItem('activeGameGroupId', selectedGroupId) } catch {}

      // Start a game round for this group
      const res = await fetch(`/api/groups/${selectedGroupId}/round`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include'
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed to start round (${res.status})`);

      // Broadcast preferences into chat so players can filter
      if (hostPrefs) {
        const prefPayload = {
          type: 'host_prefs',
          prefs: hostPrefs,
          created_at: new Date().toISOString(),
        };
        const pr = await fetch(`/api/groups/${selectedGroupId}/messages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: JSON.stringify(prefPayload) })
        });
        const pj = await pr.json().catch(() => ({}));
        if (!pr.ok) throw new Error(pj?.error || `Failed to post prefs (${pr.status})`);
      }

      // Also post a short text message with invite code if available
      if (inviteCode) {
        const text = `Game starting now! Join with code: ${inviteCode}`;
        await fetch(`/api/groups/${selectedGroupId}/messages`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ content: text })
        });
      }

      // Navigate host to preferences page (players will enter via main screen code)
      router.push(`/game/preferences?groupId=${encodeURIComponent(selectedGroupId)}`);
    } catch (e) {
      alert(e?.message || 'Failed to start and announce game');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="text-center animate-fade-in-up">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Share & Start Game
        </h1>
        <p className="text-sm px-4 py-2 rounded-full inline-block" style={{ 
          color: 'var(--muted)',
          backgroundColor: 'var(--nav-item-hover)'
        }}>
          Step 2 of 3: Choose group and generate invite
        </p>
      </div>

      {/* Main Content Card */}
      <div className="animate-fade-in-up-delayed rounded-xl p-8 space-y-8" style={{
        backgroundColor: 'var(--nav-item-bg)',
        border: '1px solid var(--nav-shadow)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl text-sm" style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca'
          }}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Group Selection Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Choose Your Group
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <select 
                className="flex-1 rounded-lg p-3 transition-all duration-200 focus:scale-105 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--nav-shadow)',
                  color: 'var(--foreground)',
                  '--tw-ring-color': 'var(--accent)'
                }}
                value={selectedGroupId} 
                onChange={e => setSelectedGroupId(e.target.value)}
              >
                <option value="">Select an existing group</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button 
                className="px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--nav-item-hover)',
                  border: '1px solid var(--nav-shadow)',
                  color: 'var(--foreground)',
                  '--tw-ring-color': 'var(--accent)'
                }}
                onClick={loadGroups}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="text-center py-2">
              <span className="text-sm font-mono" style={{ color: 'var(--muted)' }}>
                -----------or-----------
              </span>
            </div>
            <div className="flex gap-3 items-center">
              <input 
                className="flex-1 rounded-lg p-3 transition-all duration-200 focus:scale-105 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--nav-shadow)',
                  color: 'var(--foreground)',
                  '--tw-ring-color': 'var(--accent)'
                }}
                placeholder="Create new group name" 
                value={newGroupName} 
                onChange={e => setNewGroupName(e.target.value)} 
              />
              <button 
                className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--nav-text)',
                  '--tw-ring-color': 'var(--accent)',
                  boxShadow: '0 2px 8px rgba(170, 96, 200, 0.3)'
                }}
                onClick={createGroup}
              >
                Create
              </button>
            </div>
          </div>
        </section>

        {/* Invite Code Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Generate Invite Code
          </h2>
          <div className="space-y-4">
            <button 
              className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: selectedGroupId ? 'var(--accent)' : 'var(--nav-item-hover)',
                color: selectedGroupId ? 'var(--nav-text)' : 'var(--muted)',
                border: '1px solid var(--nav-shadow)',
                '--tw-ring-color': 'var(--accent)',
                boxShadow: selectedGroupId ? '0 2px 8px rgba(170, 96, 200, 0.3)' : 'none'
              }}
              onClick={createInvite} 
              disabled={!selectedGroupId}
            >
              {selectedGroupId ? 'Generate Invite Code' : 'Select a group first'}
            </button>
            {inviteCode && (
              <div className="animate-fade-in-grow p-4 rounded-lg text-center" style={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--accent)',
                boxShadow: '0 4px 12px rgba(170, 96, 200, 0.2)'
              }}>
                <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Share this code with players:</p>
                <div className="text-2xl font-mono font-bold tracking-wider" style={{ color: 'var(--accent)' }}>
                  {inviteCode}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Start Game Section */}
        <section>
          {!inviteCode && (
            <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: 'var(--nav-item-hover)', color: 'var(--muted)', border: '1px solid var(--nav-shadow)' }}>
              Generate an invite code to enable starting the game.
            </div>
          )}
          <button 
            className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
            style={{
              backgroundColor: (selectedGroupId && inviteCode && !starting) ? 'var(--accent)' : 'var(--nav-item-hover)',
              color: (selectedGroupId && inviteCode && !starting) ? 'var(--nav-text)' : 'var(--muted)',
              '--tw-ring-color': 'var(--accent)',
              boxShadow: (selectedGroupId && inviteCode && !starting) ? '0 6px 20px rgba(170, 96, 200, 0.4)' : 'none'
            }}
            onClick={startRoundAndAnnounce} 
            disabled={!selectedGroupId || !inviteCode || starting}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)'
            }} />
            <span className="relative z-10 flex items-center justify-center gap-3">
              {starting ? (
                <>
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting Game...
                </>
              ) : (
                <>
                  Start Game & Notify Players
                  <svg className="w-6 h-6 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </section>
      </div>

      {/* Info & Navigation */}
      <div className="animate-fade-in-up-delayed space-y-4">
        <div className="text-center p-4 rounded-lg" style={{
          backgroundColor: 'var(--nav-item-hover)',
          color: 'var(--muted)'
        }}>
          <p className="text-sm leading-relaxed">
            This step lets you choose a group or create a new one, generate a short invite code, and then announce the game with host preferences in the chat.
          </p>
        </div>
        
        <div className="text-center">
          <Link 
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              color: 'var(--accent)',
              backgroundColor: 'var(--nav-item-hover)'
            }}
            href="/game/host"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to host preferences
          </Link>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center animate-fade-in-up-delayed">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--nav-shadow)' }}></div>
          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--nav-shadow)' }}></div>
        </div>
      </div>
    </div>
  );
}
