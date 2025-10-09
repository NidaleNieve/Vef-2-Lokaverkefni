"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from 'lucide-react'; // using lucide-react for icons

export default function DarkModeToggle({ className = "", iconSize = 20 }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Default to dark mode unless user explicitly set light
    const savedDarkMode = localStorage.getItem('darkMode');
    const initialDarkMode = savedDarkMode !== null
      ? savedDarkMode === 'true'
      : true; // force dark mode default
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
      className={`p-2 rounded-full transition-all duration-200 ease-out flex items-center justify-center group bg-[var(--nav-item-bg)] hover:bg-[var(--nav-item-hover)] text-[color:var(--nav-text)] ${className}`}
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <Sun size={iconSize} className="transition-transform duration-200 ease-out group-hover:rotate-12" />
      ) : (
        <Moon size={iconSize} className="transition-transform duration-200 ease-out group-hover:rotate-12" />
      )}
    </button>
  );
}