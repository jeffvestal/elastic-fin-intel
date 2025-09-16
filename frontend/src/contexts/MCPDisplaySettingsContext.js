import React, { createContext, useContext, useState, useEffect } from 'react';

const MCPDisplaySettingsContext = createContext();

export const useMCPDisplaySettings = () => {
  const context = useContext(MCPDisplaySettingsContext);
  if (!context) {
    throw new Error('useMCPDisplaySettings must be used within an MCPDisplaySettingsProvider');
  }
  return context;
};

export const MCPDisplaySettingsProvider = ({ children }) => {
  const [displayMode, setDisplayMode] = useState('both'); // 'floating', 'banner', 'both'
  const [autoCollapseTime, setAutoCollapseTime] = useState(5); // seconds
  const [showExecutionHistory, setShowExecutionHistory] = useState(true);
  const [bannerPosition, setBannerPosition] = useState('bottom'); // 'top', 'bottom'

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('mcpDisplaySettings');
    console.log('🔧 MCPDisplaySettings: Loading from localStorage:', savedSettings);
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        console.log('🔧 MCPDisplaySettings: Parsed settings:', parsed);
        setDisplayMode(parsed.displayMode || 'both');
        setAutoCollapseTime(parsed.autoCollapseTime || 5);
        setShowExecutionHistory(parsed.showExecutionHistory ?? true);
        setBannerPosition(parsed.bannerPosition || 'bottom');
      } catch (error) {
        console.warn('Failed to parse MCP display settings from localStorage:', error);
      }
    } else {
      console.log('🔧 MCPDisplaySettings: No saved settings, using defaults');
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = (newSettings) => {
    const settingsToSave = {
      displayMode: newSettings.displayMode ?? displayMode,
      autoCollapseTime: newSettings.autoCollapseTime ?? autoCollapseTime,
      showExecutionHistory: newSettings.showExecutionHistory ?? showExecutionHistory,
      bannerPosition: newSettings.bannerPosition ?? bannerPosition,
    };
    
    localStorage.setItem('mcpDisplaySettings', JSON.stringify(settingsToSave));
    
    // Update state
    if (newSettings.displayMode !== undefined) setDisplayMode(newSettings.displayMode);
    if (newSettings.autoCollapseTime !== undefined) setAutoCollapseTime(newSettings.autoCollapseTime);
    if (newSettings.showExecutionHistory !== undefined) setShowExecutionHistory(newSettings.showExecutionHistory);
    if (newSettings.bannerPosition !== undefined) setBannerPosition(newSettings.bannerPosition);
  };

  const updateDisplayMode = (mode) => {
    saveSettings({ displayMode: mode });
  };

  const updateAutoCollapseTime = (time) => {
    saveSettings({ autoCollapseTime: time });
  };

  const updateShowExecutionHistory = (show) => {
    saveSettings({ showExecutionHistory: show });
  };

  const updateBannerPosition = (position) => {
    saveSettings({ bannerPosition: position });
  };

  const resetToDefaults = () => {
    const defaults = {
      displayMode: 'both',
      autoCollapseTime: 5,
      showExecutionHistory: true,
      bannerPosition: 'bottom'
    };
    saveSettings(defaults);
  };

  // Computed properties for convenience
  const showFloating = displayMode === 'floating' || displayMode === 'both';
  const showBanner = displayMode === 'banner' || displayMode === 'both';
  
  // Debug logging for computed properties
  useEffect(() => {
    console.log('🔧 MCPDisplaySettings: Display mode:', displayMode);
    console.log('🔧 MCPDisplaySettings: Show banner:', showBanner);
    console.log('🔧 MCPDisplaySettings: Show floating:', showFloating);
    console.log('🔧 MCPDisplaySettings: Banner position:', bannerPosition);
  }, [displayMode, showBanner, showFloating, bannerPosition]);

  const value = {
    // Settings
    displayMode,
    autoCollapseTime,
    showExecutionHistory,
    bannerPosition,
    
    // Computed
    showFloating,
    showBanner,
    
    // Actions
    updateDisplayMode,
    updateAutoCollapseTime,
    updateShowExecutionHistory,
    updateBannerPosition,
    resetToDefaults,
    
    // Bulk update
    saveSettings
  };

  return (
    <MCPDisplaySettingsContext.Provider value={value}>
      {children}
    </MCPDisplaySettingsContext.Provider>
  );
};

export default MCPDisplaySettingsContext;