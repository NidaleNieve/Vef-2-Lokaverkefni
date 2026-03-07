"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, User, MessageSquare, Users, Menu, X, LogIn } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import DarkModeToggleWithLabel from './DarkModeToggleWithLabel';
import { supabaseBrowser } from '@/utils/supabase/browser';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showActiveGame, setShowActiveGame] = useState(true);
  const [isAuthed, setIsAuthed] = useState(null); // null unknown

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load active game metadata from localStorage and listen to changes
  useEffect(() => {
    const load = () => {
      try {
        const gid = localStorage.getItem('activeGameGroupId') || localStorage.getItem('lastGroupId') || ''
        const code = localStorage.getItem('activeGameInviteCode') || ''
        const createdAt = localStorage.getItem('activeGameCreatedAt') || null
        const resultsWatched = localStorage.getItem('activeGameResultsWatched') || null

        setActiveGroupId(gid || '')
        setInviteCode(code || '')

        // Decide whether to show the Game button:
        // - hide if the game was created more than 10 minutes ago
        // - hide if the results for this group were watched
        let visible = !!gid
        if (gid && createdAt) {
          try {
            const ageMs = Date.now() - Date.parse(createdAt)
            if (!Number.isNaN(ageMs) && ageMs > 10 * 60 * 1000) visible = false
          } catch {}
        }
        if (gid && resultsWatched && resultsWatched === gid) visible = false
        setShowActiveGame(visible)
      } catch {}
    }
    load()
    const onStorage = (e) => {
      if (!e) return
      // react to changes relevant to active-game visibility
      if (e.key === 'activeGameGroupId' || e.key === 'activeGameInviteCode' || e.key === 'lastGroupId' || e.key === 'activeGameCreatedAt' || e.key === 'activeGameResultsWatched') {
        load()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Check auth status and subscribe to changes
  useEffect(() => {
    const supabase = supabaseBrowser();
    let mounted = true;
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setIsAuthed(!!data?.user);
      } catch {
        if (mounted) setIsAuthed(false);
      }
    };
    (async () => {
      await checkAuth();
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user);
    });
    // Also respond to visibility/focus changes and custom auth events
    const onFocus = () => { checkAuth(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') checkAuth(); };
    const onCustomAuth = () => { checkAuth(); };
    const onStorage = (e) => { if (e && e.key === 'auth:updated') checkAuth(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('auth:updated', onCustomAuth);
    window.addEventListener('storage', onStorage);
    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('auth:updated', onCustomAuth);
      window.removeEventListener('storage', onStorage);
    }
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "py-2 shadow-lg" : "py-4"
      }`}
      style={{ 
        background: "var(--nav-bg)",
        boxShadow: isScrolled ? "0 4px 20px var(--nav-shadow)" : "none"
      }}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="relative flex items-center">
          <Link href="/" className="group text-2xl font-bold cursor-pointer flex items-center transition-transform duration-300 ease-out will-change-transform transform-gpu hover:scale-105"
            style={{ color: "var(--nav-text)" }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}>
            <Image alt="Logo" src="/logo_720.png" width={50} height={50} className="w-10 h-10 mr-2 transition-transform duration-300 ease-out will-change-transform transform-gpu group-hover:rotate-6"/>
            Gastroswipe
          </Link>
          
          {/* Did You Know Tooltip */}
          <div 
            className={`absolute top-full left-0 mt-2 w-64 p-3 rounded-lg shadow-lg transition-all duration-300 z-50 ${
              showTooltip ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
            }`}
            style={{
              background: "var(--nav-item-hover)",
              color: "var(--nav-text)"
            }}
          >
            <div className="text-sm font-medium">
              <span className="font-bold">Did you know:</span> Gastronomy is the practice or art of choosing, cooking, and eating good food.
            </div>
            <div 
              className="absolute -top-1.5 left-6 w-3 h-3 rotate-45"
              style={{
                background: "var(--nav-item-hover)"
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center space-x-2">
            {showActiveGame && activeGroupId && (
              <li>
                <a 
                  href={`/groups/${activeGroupId}/swipe`} 
                  className="px-4 py-2 rounded-lg flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm transition-colors duration-200 ease-out will-change-transform transform-gpu hover:scale-[1.02]"
                >
                  <Home size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                  Game
                </a>
              </li>
            )}
            <li>
              {isAuthed ? (
                <a 
                  href="/profile" 
                  className="px-4 py-2 rounded-lg flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm transition-colors duration-200 ease-out will-change-[transform] transform-gpu hover:scale-[1.02]"
                >
                  <User size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                  Profile
                </a>
              ) : (
                <a 
                  href="/auth/signin" 
                  className="px-4 py-2 rounded-lg flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm transition-colors duration-200 ease-out will-change-transform transform-gpu hover:scale-[1.02]"
                >
                  <LogIn size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                  Sign in
                </a>
              )}
            </li>
            <li>
              <a 
                href="/chat" 
                className="px-4 py-2 rounded-lg flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm transition-colors duration-200 ease-out will-change-transform transform-gpu hover:scale-[1.02]"
              >
                <MessageSquare size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                Chat
              </a>
            </li>
            <li>
              <Link 
                href="/groups" 
                className="px-4 py-2 rounded-lg flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm transition-colors duration-200 ease-out will-change-transform transform-gpu hover:scale-[1.02]"
              >
                <Users size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                Groups
              </Link>
            </li>
            <li className="pl-2">
              <DarkModeToggle iconSize={20} />
            </li>
          </ul>

          {/* Mobile Navigation - Profile link outside hamburger */}
          <div className="md:hidden flex items-center">
            {isAuthed ? (
              <a 
                href="/profile" 
                className="px-3 py-2 rounded-lg flex items-center gap-2 mr-4 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] transition-colors duration-200 ease-out transform-gpu will-change-transform active:scale-95"
              >
                <User size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />
              </a>
            ) : (
              <a 
                href="/auth/signin" 
                className="px-3 py-2 rounded-lg flex items-center gap-2 mr-4 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] transition-colors duration-200 ease-out transform-gpu will-change-transform active:scale-95"
              >
                <LogIn size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />
              </a>
            )}
            
            <button
              className="relative w-8 h-8 focus:outline-none flex items-center justify-center transition-transform hover:scale-110"
              style={{ color: "var(--nav-text)" }}
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X size={32} /> : <Menu size={32} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div 
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity] ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ background: "var(--nav-bg)" }}
      >
        <ul className="container mx-auto px-4 py-4 flex flex-col space-y-4">
          {showActiveGame && activeGroupId && (
            <li>
              <a 
                href={`/groups/${activeGroupId}/swipe`} 
                className="flex items-center gap-3 px-4 py-3 rounded-lg group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] transition-colors duration-200 ease-out will-change-transform transform-gpu active:scale-95"
                onClick={() => setOpen(false)}
              >
                <Home size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                Game
              </a>
            </li>
          )}
          {[{name: 'Chat', href: '/chat'}, {name: 'Groups', href: '/groups'}].map((item, index) => (
            <li key={item.name}>
              <a 
                href={item.href} 
                className="flex items-center gap-3 px-4 py-3 rounded-lg group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] transition-colors duration-200 ease-out will-change-transform transform-gpu active:scale-95"
                onClick={() => setOpen(false)}
              >
                {index === 0 && <MessageSquare size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />}
                {index === 1 && <Users size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />}
                {item.name}
              </a>
            </li>
          ))}
          {!isAuthed && (
            <li>
              <a 
                href="/auth/signin" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] transition-colors duration-200 ease-out will-change-transform transform-gpu active:scale-95"
                onClick={() => setOpen(false)}
              >
                <LogIn size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                Sign in
              </a>
            </li>
          )}
          <li className="flex justify-center">
            <DarkModeToggleWithLabel iconSize={20} />
          </li>
        </ul>
      </div>
    </nav>
  );
}