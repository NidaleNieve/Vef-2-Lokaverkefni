"use client";
import { useState, useEffect } from "react";
import { Home, User, MessageSquare, Users, Menu, X } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import DarkModeToggleWithLabel from './DarkModeToggleWithLabel';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
          <h1 
            className="text-2xl font-bold transition-all duration-300 hover:scale-105 cursor-pointer flex items-center"
            style={{ color: "var(--nav-text)" }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <img src="/logo.png" alt="Gastroswipe" className="w-8 h-8 mr-2" onError={() => setLogoError(true)}/>
            Gastroswipe
          </h1>
          
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
            <li>
              <a 
                href="#" 
                className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 group"
                style={{ 
                  color: "var(--nav-text)",
                  background: "var(--nav-item-bg)"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--nav-item-hover)"}
                onMouseLeave={(e) => e.target.style.background = "var(--nav-item-bg)"}
              >
                <User size={18} className="group-hover:scale-110 transition-transform" />
                Profile
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 group"
                style={{ 
                  color: "var(--nav-text)",
                  background: "var(--nav-item-bg)"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--nav-item-hover)"}
                onMouseLeave={(e) => e.target.style.background = "var(--nav-item-bg)"}
              >
                <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                Chat
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 group"
                style={{ 
                  color: "var(--nav-text)",
                  background: "var(--nav-item-bg)"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--nav-item-hover)"}
                onMouseLeave={(e) => e.target.style.background = "var(--nav-item-bg)"}
              >
                <Users size={18} className="group-hover:scale-110 transition-transform" />
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
              href="#" 
              className="px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 mr-4 group"
              style={{ 
                color: "var(--nav-text)",
                background: "var(--nav-item-bg)"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--nav-item-hover)"}
              onMouseLeave={(e) => e.target.style.background = "var(--nav-item-bg)"}
            >
              <User size={20} className="group-hover:scale-110 transition-transform" />
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
          {['Chat', 'Groups'].map((item, index) => (
            <li key={item}>
              <a 
                href="#" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group"
                style={{ 
                  color: "var(--nav-text)",
                  background: "var(--nav-item-bg)"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--nav-item-hover)"}
                onMouseLeave={(e) => e.target.style.background = "var(--nav-item-bg)"}
                onClick={() => setOpen(false)}
              >
                {index === 0 && <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />}
                {index === 1 && <Users size={20} className="group-hover:scale-110 transition-transform" />}
                {item}
              </a>
            </li>
          ))}
          <li className="px-4 py-3 flex justify-center">
            <DarkModeToggleWithLabel 
              onClick={() => setOpen(false)}
              iconSize={18}
            />
          </li>
        </ul>
      </div>
    </nav>
  );
}