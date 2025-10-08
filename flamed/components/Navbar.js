"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, User, MessageSquare, Users, Menu, X } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const router = useRouter();
  const pathname = usePathname();

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
        setActiveGroupId(gid || '')
        setInviteCode(code || '')
      } catch {}
    }
    load()
    const onStorage = (e) => {
      if (!e) return
      if (e.key === 'activeGameGroupId' || e.key === 'activeGameInviteCode' || e.key === 'lastGroupId') {
        load()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleLogoClick = (e) => {
    // If currently on a swipe page (in-game), go to home to start a new game
    const inGamePath = typeof pathname === 'string' && /\/groups\/.+\/swipe/.test(pathname)
    if (inGamePath) {
      e.preventDefault()
      router.push('/')
      return
    }
    // Else if we have an active game, jump back into it
    if (activeGroupId) {
      e.preventDefault()
      router.push(`/groups/${activeGroupId}/swipe`)
    }
  }

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
          <Link href="/" className="text-2xl font-bold transition-all duration-300 hover:scale-105 cursor-pointer flex items-center"
            style={{ color: "var(--nav-text)" }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={handleLogoClick}
          >
            <Image alt="Logo" src="/logo_720.png" width={50} height={50} className="w-10 h-10 mr-2"/>
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
          {/* Global invite pill when in an active game */}
          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center space-x-2">
            <li>
              <a 
                href="/profile" 
                className="px-4 py-2 rounded-lg transition-all duration-200 ease-out flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm"
              >
                <User size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                Profile
              </a>
            </li>
            <li>
              <a 
                href="/chat" 
                className="px-4 py-2 rounded-lg transition-all duration-200 ease-out flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm"
              >
                <MessageSquare size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                Chat
              </a>
            </li>
            <li>
              <a 
                href="/groups" 
                className="px-4 py-2 rounded-lg transition-all duration-200 ease-out flex items-center gap-2 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] hover:shadow-sm"
              >
                <Users size={18} className="transition-transform duration-200 ease-out group-hover:scale-105" />
                Groups
              </a>
            </li>
            <li className="pl-2">
              <DarkModeToggle iconSize={20} />
            </li>
          </ul>

          {/* Mobile Navigation - Profile link outside hamburger */}
          <div className="md:hidden flex items-center">
            <a 
              href="/profile" 
              className="px-3 py-2 rounded-lg transition-all duration-200 ease-out flex items-center gap-2 mr-4 group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)]"
            >
              <User size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />
            </a>
            
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
        className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ background: "var(--nav-bg)" }}
      >
        <ul className="container mx-auto px-4 py-4 flex flex-col space-y-4">
          {[{name: 'Chat', href: '/chat'}, {name: 'Groups', href: '/groups'}].map((item, index) => (
            <li key={item.name}>
              <a 
                href={item.href} 
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-out group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)]"
                onClick={() => setOpen(false)}
              >
                {index === 0 && <MessageSquare size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />}
                {index === 1 && <Users size={20} className="transition-transform duration-200 ease-out group-hover:scale-105" />}
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}