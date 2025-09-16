import React, { createContext, useContext, useState } from 'react';

const PageContext = createContext();

export const usePageContext = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageContext must be used within a PageContextProvider');
  }
  return context;
};

export const PageContextProvider = ({ children }) => {
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  
  // Global chat state
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [globalChatPosition, setGlobalChatPosition] = useState(() => {
    return localStorage.getItem('globalChatPosition') || 'bottom';
  });
  
  // Update localStorage when position changes
  const updateChatPosition = (position) => {
    setGlobalChatPosition(position);
    localStorage.setItem('globalChatPosition', position);
  };

  // Helper function to get page name from path
  const getPageNameFromPath = (path) => {
    if (path.startsWith('/customer-success')) {
      return 'Customer Success';
    } else if (path.startsWith('/account/')) {
      return 'Account Details';
    } else if (path.startsWith('/alerts')) {
      return 'Proactive Alerts';
    } else if (path.startsWith('/accounts')) {
      return 'Accounts List';
    } else if (path.startsWith('/news')) {
      return 'News';
    } else if (path.startsWith('/reports')) {
      return 'Reports';
    } else if (path.startsWith('/settings')) {
      return 'Settings';
    }
    return 'Overview';
  };

  const pageInfo = {
    path: currentPath,
    name: getPageNameFromPath(currentPath),
    hasContext: !!currentCustomer || !!currentAccount
  };

  // Generate context-aware chat prompt
  const getContextPrompt = () => {
    let prompt = `I'm currently on the ${pageInfo.name} page.`;
    
    if (currentCustomer) {
      prompt += ` I'm viewing customer: ${currentCustomer.name} (${currentCustomer.account_id}).`;
      
      if (currentCustomer.total_portfolio_value) {
        prompt += ` Their portfolio is worth $${(currentCustomer.total_portfolio_value / 1000000).toFixed(1)}M.`;
      }
      
      if (currentCustomer.holdings && currentCustomer.holdings.length > 0) {
        const topHoldings = currentCustomer.holdings.slice(0, 3).map(h => h.symbol).join(', ');
        prompt += ` Top holdings: ${topHoldings}.`;
      }
      
      if (currentCustomer.risk_score) {
        prompt += ` Risk score: ${currentCustomer.risk_score}/10.`;
      }
    }
    
    if (currentAccount) {
      prompt += ` I'm viewing account: ${currentAccount.account_id}`;
      if (currentAccount.account_name) {
        prompt += ` (${currentAccount.account_name})`;
      }
      prompt += `.`;
      
      if (currentAccount.balance) {
        const balanceFormatted = currentAccount.balance > 1000000 
          ? `$${(currentAccount.balance / 1000000).toFixed(1)}M`
          : `$${currentAccount.balance.toLocaleString()}`;
        prompt += ` Total portfolio value: ${balanceFormatted}.`;
      }
      
      if (currentAccount.type) {
        prompt += ` Account type: ${currentAccount.type}.`;
      }
      
      if (currentAccount.risk_profile) {
        prompt += ` Risk profile: ${currentAccount.risk_profile}.`;
      }
      
      if (currentAccount.holdings && currentAccount.holdings.length > 0) {
        const topHoldings = currentAccount.holdings
          .slice(0, 5)
          .map(h => `${h.symbol} (${h.quantity} shares, $${h.current_value?.toLocaleString() || 'N/A'})`)
          .join(', ');
        prompt += ` Top holdings: ${topHoldings}.`;
      }
    }
    
    return prompt;
  };

  const value = {
    currentCustomer,
    setCurrentCustomer,
    currentAccount,
    setCurrentAccount,
    currentPath,
    setCurrentPath,
    pageInfo,
    getContextPrompt,
    hasCustomerContext: !!currentCustomer,
    hasAccountContext: !!currentAccount,
    // Global chat state
    globalChatOpen,
    setGlobalChatOpen,
    globalChatPosition,
    setGlobalChatPosition,
    updateChatPosition
  };

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
};

export default PageContextProvider;