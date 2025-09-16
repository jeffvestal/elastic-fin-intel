import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import PageTransition from './PageTransition';
import { usePageContext } from '../contexts/PageContextProvider';

import Overview from '../pages/Overview';
import ProactiveAlerts from '../pages/ProactiveAlerts';
import AccountDrilldown from '../pages/AccountDrilldown';
import AccountsList from '../pages/AccountsList';
import NewsList from '../pages/NewsList';
import ReportsList from '../pages/ReportsList';
import Settings from '../pages/Settings';
import CustomerSuccess from '../pages/CustomerSuccess';

const AnimatedRoutes = () => {
  const location = useLocation();
  const { setCurrentPath } = usePageContext();

  // Update the current path in page context when location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);

  return (
    <Routes location={location} key={location.pathname}>
      <Route 
        path="/" 
        element={
          <PageTransition key="overview">
            <Overview />
          </PageTransition>
        } 
      />
      <Route 
        path="/alerts" 
        element={
          <PageTransition key="alerts">
            <ProactiveAlerts />
          </PageTransition>
        } 
      />
      <Route 
        path="/accounts" 
        element={
          <PageTransition key="accounts">
            <AccountsList />
          </PageTransition>
        } 
      />
      <Route 
        path="/news" 
        element={
          <PageTransition key="news">
            <NewsList />
          </PageTransition>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <PageTransition key="reports">
            <ReportsList />
          </PageTransition>
        } 
      />
      <Route 
        path="/account/:accountId" 
        element={
          <PageTransition key="account-detail">
            <AccountDrilldown />
          </PageTransition>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <PageTransition key="settings">
            <Settings />
          </PageTransition>
        } 
      />
      <Route 
        path="/customer-success" 
        element={
          <PageTransition key="customer-success">
            <CustomerSuccess />
          </PageTransition>
        } 
      />
    </Routes>
  );
};

export default AnimatedRoutes;