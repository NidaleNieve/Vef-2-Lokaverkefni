"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from 'lucide-react'; // using lucide-react for icons

export default function DarkModeToggle({ className = "", iconSize = 20 }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check localStorage first, then system preference
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
      className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center group ${className}`}
      style={{ 
        background: "var(--nav-item-bg)",
        color: "var(--nav-text)"
      }}
      onMouseEnter={(e) => e.target.style.background = "var(--nav-item-hover)"}
      onMouseLeave={(e) => e.target.style.background = "var(--nav-item-bg)"}
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <Sun size={iconSize} className="group-hover:rotate-12 transition-transform" />
      ) : (
        <Moon size={iconSize} className="group-hover:rotate-12 transition-transform" />
      )}
    </button>
  );
}