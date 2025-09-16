import React, { createContext, useContext, useState, useEffect } from 'react';

const AppModeContext = createContext();

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
};

export const AppModeProvider = ({ children }) => {
  const [appMode, setAppMode] = useState(() => {
    // Load from localStorage or default to 'portfolio'
    const savedMode = localStorage.getItem('appMode');
    return savedMode || 'portfolio';
  });

  // Save to localStorage whenever app mode changes
  useEffect(() => {
    localStorage.setItem('appMode', appMode);
  }, [appMode]);

  const switchToPortfolio = () => setAppMode('portfolio');
  const switchToCustomerSuccess = () => setAppMode('customer-success');
  
  const toggleAppMode = () => {
    const newMode = appMode === 'portfolio' ? 'customer-success' : 'portfolio';
    console.log('🔄 AppMode: Switching from', appMode, 'to', newMode);
    
    // Clear MCP display settings when switching to customer success to ensure fresh defaults
    if (newMode === 'customer-success') {
      console.log('🔄 AppMode: Clearing MCP display settings for fresh Customer Success start');
      localStorage.removeItem('mcpDisplaySettings');
    }
    
    setAppMode(newMode);
  };

  const value = {
    appMode,
    isPortfolioMode: appMode === 'portfolio',
    isCustomerSuccessMode: appMode === 'customer-success',
    switchToPortfolio,
    switchToCustomerSuccess,
    toggleAppMode,
  };

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
};