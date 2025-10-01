// app/components/ConditionalNavbar.js
'use client';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const { hasSession } = useApp();
  console.log('Navbar session state:', hasSession); // Debug log
  
  if (!hasSession) return null;
  
  return (
    <header className="text-white" style={{ background: "var(--nav-footer-bg)" }}>
      <Navbar />
    </header>
  );
}