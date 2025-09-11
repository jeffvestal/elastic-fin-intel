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
  const [displayMode, setDisplayMode] = useState('floating'); // 'floating', 'banner', 'both'
  const [autoCollapseTime, setAutoCollapseTime] = useState(5); // seconds
  const [showExecutionHistory, setShowExecutionHistory] = useState(true);
  const [bannerPosition, setBannerPosition] = useState('top'); // 'top', 'bottom'

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('mcpDisplaySettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDisplayMode(parsed.displayMode || 'floating');
        setAutoCollapseTime(parsed.autoCollapseTime || 5);
        setShowExecutionHistory(parsed.showExecutionHistory ?? true);
        setBannerPosition(parsed.bannerPosition || 'top');
      } catch (error) {
        console.warn('Failed to parse MCP display settings from localStorage:', error);
      }
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
      displayMode: 'floating',
      autoCollapseTime: 5,
      showExecutionHistory: true,
      bannerPosition: 'top'
    };
    saveSettings(defaults);
  };

  // Computed properties for convenience
  const showFloating = displayMode === 'floating' || displayMode === 'both';
  const showBanner = displayMode === 'banner' || displayMode === 'both';

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