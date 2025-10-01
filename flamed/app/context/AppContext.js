// app/context/AppContext.js
'use client';
import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [hasSession, setHasSession] = useState(false);
  const [userCode, setUserCode] = useState(null);

  return (
    <AppContext.Provider value={{ 
      hasSession, 
      setHasSession, 
      userCode, 
      setUserCode 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};