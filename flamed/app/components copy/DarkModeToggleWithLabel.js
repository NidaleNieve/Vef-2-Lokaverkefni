"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from 'lucide-react';

export default function DarkModeToggleWithLabel({ className = "", iconSize = 18 }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialDarkMode = savedDarkMode !== null 
      ? savedDarkMode === 'true' 
      : systemPrefersDark;
    
    setDarkMode(initialDarkMode);
    document.documentElement.classList.toggle('dark', initialDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  return (
    <button
      onClick={toggleDarkMode}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 group ${className}`}
      style={{ 
        background: "var(--nav-item-bg)",
        color: "var(--nav-text)"
      }}
      onMouseEnter={(e) => e.target.style.background = "var(--nav-item-hover)"}
      onMouseLeave={(e) => e.target.style.background = "var(--nav-item-bg)"}
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <>
          <Sun size={iconSize} className="group-hover:rotate-12 transition-transform" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon size={iconSize} className="group-hover:rotate-12 transition-transform" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}