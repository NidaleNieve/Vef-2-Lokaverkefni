// app/components/ConditionalNavbar.js
// this code renders the navbar only if there is a session(using the app context) if its not in session then it returns to null.
'use client';
import { useApp } from '../context/AppContext';
import Navbar from '../../components/Navbar';

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