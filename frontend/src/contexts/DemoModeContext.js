import React, { createContext, useContext, useState, useEffect } from 'react';

const DemoModeContext = createContext();

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};

export const DemoModeProvider = ({ children }) => {
  // Load demo mode state from localStorage, default to false
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const stored = localStorage.getItem('elastic-fin-intel-demo-mode');
    return stored ? JSON.parse(stored) : false;
  });

  // Persist demo mode state to localStorage
  useEffect(() => {
    localStorage.setItem('elastic-fin-intel-demo-mode', JSON.stringify(isDemoMode));
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
  };

  const enableDemoMode = () => {
    setIsDemoMode(true);
  };

  const disableDemoMode = () => {
    setIsDemoMode(false);
  };

  const value = {
    isDemoMode,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
};