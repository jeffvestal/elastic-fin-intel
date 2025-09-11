import React, { createContext, useContext, useState } from 'react';

const MCPNotificationContext = createContext();

export const useMCPNotification = () => {
  const context = useContext(MCPNotificationContext);
  if (!context) {
    throw new Error('useMCPNotification must be used within an MCPNotificationProvider');
  }
  return context;
};

// Helper functions for enhanced tracking
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('mcpSessionId');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('mcpSessionId', sessionId);
  }
  return sessionId;
};

const inferCategory = (toolName) => {
  const lower = toolName.toLowerCase();
  if (lower.includes('search') || lower.includes('query') || lower.includes('find')) return 'search';
  if (lower.includes('analysis') || lower.includes('analyze') || lower.includes('report')) return 'analysis';
  if (lower.includes('content') || lower.includes('loading') || lower.includes('fetch')) return 'content';
  if (lower.includes('account') || lower.includes('portfolio')) return 'account';
  if (lower.includes('news') || lower.includes('article')) return 'news';
  return 'general';
};

const inferPriority = (toolName, description) => {
  const combined = `${toolName} ${description}`.toLowerCase();
  if (combined.includes('urgent') || combined.includes('critical') || combined.includes('alert')) return 'high';
  if (combined.includes('analysis') || combined.includes('report') || combined.includes('account')) return 'medium';
  return 'low';
};

export const MCPNotificationProvider = ({ children }) => {
  const [activeTools, setActiveTools] = useState(new Map());
  const [hideTimers, setHideTimers] = useState(new Map());
  const [executionHistory, setExecutionHistory] = useState([]);

  const showMCPTool = (toolName, description = '', serverName = 'Unknown', parameters = {}) => {
    const id = `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔧 MCP Notification: Showing tool', { toolName, description, id, serverName, parameters });
    
    const toolData = {
      toolName,
      description,
      serverName,
      parameters: parameters || {},
      startTime: Date.now(),
      status: 'executing',
      category: inferCategory(toolName),
      priority: inferPriority(toolName, description),
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
      }
    };
    
    setActiveTools(prev => {
      const newMap = new Map(prev).set(id, toolData);
      console.log('🔧 MCP Notification: Active tools after show:', newMap.size, 'New tool:', toolData);
      return newMap;
    });

    // Add to execution history immediately
    setExecutionHistory(prev => [...prev.slice(-19), { // Keep last 20 entries
      id,
      ...toolData,
      timestamp: new Date().toISOString(),
      phase: 'started'
    }]);
    
    return id;
  };

  const hideMCPTool = (id, result = null, status = 'completed') => {
    console.log('🔧 MCP Notification: Attempting to hide tool', { id, result, status });
    
    const completionTime = Date.now();
    
    // Update execution history with completion info
    setExecutionHistory(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            status: status,
            endTime: completionTime,
            duration: completionTime - item.startTime,
            result: result,
            phase: 'completed',
            success: status === 'completed',
            error: status === 'error' ? (result?.error || 'Unknown error') : null,
            metadata: {
              ...item.metadata,
              completedAt: new Date().toISOString(),
              executionContext: {
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                userActive: document.hasFocus(),
              }
            }
          }
        : item
    ));
    
    setActiveTools(prev => {
      const tool = prev.get(id);
      if (!tool) {
        console.log('🔧 MCP Notification: Tool not found', { id });
        return prev;
      }

      const timeElapsed = completionTime - tool.startTime;
      const minDisplayTime = tool.priority === 'high' ? 5000 : 3000; // Higher priority tools stay visible longer

      if (timeElapsed < minDisplayTime) {
        const remainingTime = minDisplayTime - timeElapsed;
        console.log('🔧 MCP Notification: Delaying hide for', remainingTime, 'ms (priority:', tool.priority + ')');
        
        // Set a timer to hide after minimum time
        setHideTimers(prevTimers => {
          const newTimers = new Map(prevTimers);
          const timerId = setTimeout(() => {
            console.log('🔧 MCP Notification: Timer hiding tool', { id, category: tool.category });
            setActiveTools(current => {
              const updated = new Map(current);
              updated.delete(id);
              return updated;
            });
            setHideTimers(current => {
              const updated = new Map(current);
              updated.delete(id);
              return updated;
            });
          }, remainingTime);
          newTimers.set(id, timerId);
          return newTimers;
        });
        
        return prev; // Don't hide yet
      } else {
        // Enough time has passed, hide immediately
        console.log('🔧 MCP Notification: Hiding tool immediately', { id, duration: timeElapsed + 'ms' });
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      }
    });
  };

  const hideAllTools = () => {
    // Clear all active timers
    hideTimers.forEach(timerId => clearTimeout(timerId));
    setHideTimers(new Map());
    setActiveTools(new Map());
  };

  const clearExecutionHistory = () => {
    setExecutionHistory([]);
  };

  const getExecutionStats = () => {
    const completed = executionHistory.filter(item => item.status === 'completed');
    const errors = executionHistory.filter(item => item.status === 'error');
    const totalExecutions = executionHistory.length;
    const successRate = totalExecutions > 0 ? (completed.length / totalExecutions) * 100 : 0;
    const averageDuration = completed.length > 0 
      ? completed.reduce((sum, item) => sum + (item.duration || 0), 0) / completed.length 
      : 0;

    // Category breakdown
    const categoryStats = executionHistory.reduce((acc, item) => {
      const category = item.category || 'general';
      if (!acc[category]) {
        acc[category] = { count: 0, avgDuration: 0, totalDuration: 0 };
      }
      acc[category].count++;
      if (item.duration) {
        acc[category].totalDuration += item.duration;
        acc[category].avgDuration = acc[category].totalDuration / acc[category].count;
      }
      return acc;
    }, {});

    // Server breakdown
    const serverStats = executionHistory.reduce((acc, item) => {
      const server = item.serverName || 'Unknown';
      if (!acc[server]) {
        acc[server] = { count: 0, successCount: 0, errorCount: 0 };
      }
      acc[server].count++;
      if (item.status === 'completed') acc[server].successCount++;
      if (item.status === 'error') acc[server].errorCount++;
      return acc;
    }, {});

    // Recent activity (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentActivity = executionHistory.filter(item => 
      new Date(item.timestamp).getTime() > oneHourAgo
    ).length;
    
    return {
      totalExecutions,
      completedExecutions: completed.length,
      errorExecutions: errors.length,
      successRate: Math.round(successRate),
      averageDuration: Math.round(averageDuration),
      activeCount: activeTools.size,
      categoryStats,
      serverStats,
      recentActivity,
      sessionId: getSessionId(),
      lastExecution: executionHistory.length > 0 
        ? executionHistory[executionHistory.length - 1].timestamp 
        : null,
      // Performance metrics
      fastExecutions: completed.filter(item => item.duration < 1000).length,
      slowExecutions: completed.filter(item => item.duration > 5000).length,
      // Priority breakdown
      highPriorityCount: executionHistory.filter(item => item.priority === 'high').length,
      mediumPriorityCount: executionHistory.filter(item => item.priority === 'medium').length,
      lowPriorityCount: executionHistory.filter(item => item.priority === 'low').length,
    };
  };

  const value = {
    activeTools,
    executionHistory,
    showMCPTool,
    hideMCPTool,
    hideAllTools,
    clearExecutionHistory,
    getExecutionStats
  };

  return (
    <MCPNotificationContext.Provider value={value}>
      {children}
    </MCPNotificationContext.Provider>
  );
};

export default MCPNotificationContext;