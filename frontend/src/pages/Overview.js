import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Grid, Typography, CircularProgress, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import MetricCard from '../components/MetricCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArticleIcon from '@mui/icons-material/Article';
import AssessmentIcon from '@mui/icons-material/Assessment';
import axios from 'axios';
import ExpandableNewsSummary from '../components/ExpandableNewsSummary';
import ExpandableReportSummary from '../components/ExpandableReportSummary';
import FullArticleDialog from '../components/FullArticleDialog';
import FullReportDialog from '../components/FullReportDialog';

const Overview = () => {
  const navigate = useNavigate();
  const { showMCPTool, hideMCPTool } = useMCPNotification();
  const { isDemoMode } = useDemoMode();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [actionItemLoading, setActionItemLoading] = useState(false);
  const [actionItem, setActionItem] = useState(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState({ documentId: null, index: null });
  const [selectedReport, setSelectedReport] = useState({ documentId: null, index: null });

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('http://localhost:8000/metrics/overview');
      setMetrics(response.data);
    } catch (error) {
      console.log('Backend not available - using demo metrics data');
      // Set demo metrics data
      setMetrics({
        total_accounts: 147,
        total_aum: 2840000000,
        total_holdings: 892,
        avg_portfolio_value: 19320000,
        top_performing_account: "Wellington Capital Management",
        top_performing_return: 0.084,
        high_risk_accounts: 12,
        news_count: 0,
        reports_count: 0,
        news: [],
        reports: []
      });
    }
  };

  const fetchMetricsWithContent = async () => {
    const notificationId = showMCPTool('Enhanced Content Loading', 'Fetching AI-enhanced news and reports summaries');
    
    setNewsLoading(true);
    setReportsLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/metrics/overview?include_news=true&include_reports=true');
      setMetrics(response.data);
    } catch (error) {
      console.log('Backend not available - using demo metrics with content');
      // Set demo metrics with sample news and reports
      setMetrics({
        total_accounts: 147,
        total_aum: 2840000000,
        total_holdings: 892,
        avg_portfolio_value: 19320000,
        top_performing_account: "Wellington Capital Management",
        top_performing_return: 0.084,
        high_risk_accounts: 12,
        news_count: 5,
        reports_count: 3,
        news: [
          {
            _id: "demo-news-1",
            title: "Market volatility impacts technology sector",
            summary: "Recent market movements show increased volatility in tech stocks.",
            published_date: "2024-01-15T10:30:00Z",
            symbol: "AAPL",
            source: "Financial News"
          },
          {
            _id: "demo-news-2",
            title: "Federal Reserve considers rate adjustments",
            summary: "Economic indicators suggest potential monetary policy changes.",
            published_date: "2024-01-15T08:15:00Z",
            symbol: "SPY",
            source: "Economic Times"
          }
        ],
        reports: [
          {
            _id: "demo-report-1",
            title: "Q4 2024 Market Analysis Report",
            summary: "Comprehensive analysis of market performance and outlook.",
            published_date: "2024-01-10T14:00:00Z",
            symbol: "QQQ",
            source: "Market Research"
          }
        ]
      });
    } finally {
      setNewsLoading(false);
      setReportsLoading(false);
      hideMCPTool(notificationId);
    }
  };

  const fetchActionItem = async () => {
    const notificationId = showMCPTool('Analyzing Top Accounts for Negative News', 'Checking for negative news affecting your most valuable accounts');
    
    setActionItemLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/action-item');
      setActionItem(response.data);
    } catch (error) {
      console.log('Backend not available - action item will show empty state for MCP demo');
      setActionItem(null); // Show default message instead of error
    } finally {
      setActionItemLoading(false);
      hideMCPTool(notificationId);
    }
  };

  useEffect(() => {
    fetchMetrics(); // Initial load without news
  }, []);

  const handleStartDay = async () => {
    const notificationId = showMCPTool('Start Day Analysis', 'Running daily portfolio analysis and content enhancement');
    
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/agent/start_day');
      fetchMetricsWithContent(); // Load with news and reports after "Start Day"
      fetchActionItem(); // Load action item analysis
    } catch (error) {
      console.log('Backend not available - simulating start day analysis');
      // Simulate the start day analysis by loading demo content
      fetchMetricsWithContent(); // This will use demo data due to error handling
      fetchActionItem(); // This will use demo data due to error handling
    } finally {
      setLoading(false);
      hideMCPTool(notificationId);
    }
  };

  const handleReadFullArticle = (documentId, index) => {
    setSelectedArticle({ documentId, index });
    setArticleDialogOpen(true);
  };

  const handleCloseArticleDialog = () => {
    setArticleDialogOpen(false);
    setSelectedArticle({ documentId: null, index: null });
  };

  const handleReadFullReport = (documentId, index) => {
    setSelectedReport({ documentId, index });
    setReportDialogOpen(true);
  };

  const handleCloseReportDialog = () => {
    setReportDialogOpen(false);
    setSelectedReport({ documentId: null, index: null });
  };

  const handleAccountClick = (accountId) => {
    navigate(`/account/${accountId}`);
  };

  return (
    <>
      <Box sx={{ p: isDemoMode ? 4 : 3 }}>
        <Grid container spacing={isDemoMode ? 4 : 3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    fontSize: isDemoMode ? '2.5rem' : '2rem',
                    mb: 1,
                  }}
                >
                  Portfolio Overview
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  color="text.secondary"
                  sx={{ mb: 3, fontSize: isDemoMode ? '1.125rem' : '1rem' }}
                >
                  Real-time insights powered by Elastic AI
                </Typography>
                
                <Button 
                  variant="contained" 
                  onClick={handleStartDay} 
                  disabled={loading}
                  size={isDemoMode ? "large" : "medium"}
                  sx={{
                    fontSize: isDemoMode ? '1.1rem' : 'inherit',
                    py: isDemoMode ? 1.5 : 1,
                    px: isDemoMode ? 4 : 3,
                    borderRadius: isDemoMode ? 12 : 8,
                    boxShadow: 3,
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {loading ? 'Processing...' : isDemoMode ? 'Analyze Portfolio' : 'Start Day'}
                </Button>
              </Box>
            </motion.div>
          </Grid>

          {/* Metrics Cards */}
          {metrics && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Accounts"
                  value={metrics.total_accounts}
                  subtitle="Active portfolios"
                  icon={<AccountBalanceIcon />}
                  trend="up"
                  trendValue="+3.2%"
                  onClick={() => navigate('/accounts')}
                  gradient={['#0F4C81', '#1E40AF']}
                  delay={0.1}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Assets Under Management"
                  value={metrics.total_aum}
                  subtitle="Total portfolio value"
                  icon={<TrendingUpIcon />}
                  trend="up"
                  trendValue="+8.7%"
                  gradient={['#10B981', '#059669']}
                  delay={0.2}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="News Articles"
                  value={metrics.total_news}
                  subtitle="Market updates"
                  icon={<ArticleIcon />}
                  trend="up"
                  trendValue="+12"
                  onClick={() => navigate('/news')}
                  delay={0.3}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Research Reports"
                  value={metrics.total_reports}
                  subtitle="Analyst insights"
                  icon={<AssessmentIcon />}
                  trend="up"
                  trendValue="+5"
                  onClick={() => navigate('/reports')}
                  delay={0.4}
                />
              </Grid>
            </>
          )}

          {/* Action Item Section */}
          {metrics && (
            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Action Item</Typography>
                    
                    {actionItemLoading && (
                      <Box display="flex" alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        <Typography color="textSecondary">
                          Analyzing top accounts for negative news...
                        </Typography>
                      </Box>
                    )}
                    
                    {!actionItemLoading && !actionItem && (
                      <Typography color="textSecondary" sx={{ py: 2 }}>
                        Click "Analyze Portfolio" to analyze your top accounts for negative news
                      </Typography>
                    )}
                    
                    {!actionItemLoading && actionItem && (
                      <Box sx={{ py: 1 }}>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {actionItem.message}
                        </Typography>
                        
                        {actionItem.server_used && (
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            Source: {actionItem.server_used}
                          </Typography>
                        )}
                        
                        {actionItem.status === 'success' && actionItem.affected_accounts && actionItem.affected_accounts.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                              Affected Accounts:
                            </Typography>
                            {actionItem.affected_accounts.map((account, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                <Typography 
                                  variant="body2" 
                                  component="span"
                                  sx={{ 
                                    color: 'primary.main', 
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    mr: 1
                                  }}
                                  onClick={() => handleAccountClick(account.account_id)}
                                >
                                  {account.account_name}
                                </Typography>
                                <Typography variant="body2" component="span" color="textSecondary">
                                  (${account.total_portfolio_value.toLocaleString()})
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                        
                        {actionItem.status === 'error' && (
                          <Typography color="error">
                            {actionItem.message}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          )}

          {/* News Summary - Left Column - Hidden in Demo Mode */}
          {!isDemoMode && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Latest News Summary</Typography>
                  
                  {newsLoading && (
                    <Box display="flex" alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} sx={{ mr: 2 }} />
                      <Typography color="textSecondary">
                        Summarizing latest financial news...
                      </Typography>
                    </Box>
                  )}
                  
                  {!newsLoading && metrics && metrics.news_summary === null && (
                    <Typography color="textSecondary" sx={{ py: 2 }}>
                      Click "Start Day" to summarize latest financial news
                    </Typography>
                  )}
                  
                  {!newsLoading && metrics && metrics.news_summary && metrics.news_summary.status === 'success' && (
                    <>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Source: {metrics.news_summary.server_used}
                      </Typography>
                      {metrics.news_summary.news_stories.map((story, index) => (
                        <ExpandableNewsSummary
                          key={index}
                          story={story}
                          onReadFullArticle={handleReadFullArticle}
                        />
                      ))}
                    </>
                  )}
                  
                  {!newsLoading && metrics && metrics.news_summary && metrics.news_summary.status === 'no_servers' && (
                    <Typography color="textSecondary">
                      {metrics.news_summary.message}
                    </Typography>
                  )}
                  
                  {!newsLoading && metrics && metrics.news_summary && metrics.news_summary.status === 'no_data' && (
                    <Typography color="warning.main">
                      {metrics.news_summary.message}
                    </Typography>
                  )}
                  
                  {!newsLoading && metrics && metrics.news_summary && metrics.news_summary.status === 'error' && (
                    <Typography color="error">
                      {metrics.news_summary.message}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Reports Summary - Right Column - Hidden in Demo Mode */}
          {!isDemoMode && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Latest Reports Summary</Typography>
                  
                  {reportsLoading && (
                    <Box display="flex" alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} sx={{ mr: 2 }} />
                      <Typography color="textSecondary">
                        Summarizing latest financial reports...
                      </Typography>
                    </Box>
                  )}
                  
                  {!reportsLoading && metrics && metrics.reports_summary === null && (
                    <Typography color="textSecondary" sx={{ py: 2 }}>
                      Click "Start Day" to summarize latest financial reports
                    </Typography>
                  )}
                  
                  {!reportsLoading && metrics && metrics.reports_summary && metrics.reports_summary.status === 'success' && (
                    <>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Source: {metrics.reports_summary.server_used}
                      </Typography>
                      {metrics.reports_summary.reports.map((report, index) => (
                        <ExpandableReportSummary
                          key={index}
                          report={report}
                          onReadFullReport={handleReadFullReport}
                        />
                      ))}
                    </>
                  )}
                  
                  {!reportsLoading && metrics && metrics.reports_summary && metrics.reports_summary.status === 'no_servers' && (
                    <Typography color="textSecondary">
                      {metrics.reports_summary.message}
                    </Typography>
                  )}
                  
                  {!reportsLoading && metrics && metrics.reports_summary && metrics.reports_summary.status === 'no_data' && (
                    <Typography color="warning.main">
                      {metrics.reports_summary.message}
                    </Typography>
                  )}
                  
                  {!reportsLoading && metrics && metrics.reports_summary && metrics.reports_summary.status === 'error' && (
                    <Typography color="error">
                      {metrics.reports_summary.message}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
        
      {/* Full Article Dialog */}
      <FullArticleDialog
        open={articleDialogOpen}
        onClose={handleCloseArticleDialog}
        documentId={selectedArticle.documentId}
        index={selectedArticle.index}
      />

      {/* Full Report Dialog */}
      <FullReportDialog
        open={reportDialogOpen}
        onClose={handleCloseReportDialog}
        documentId={selectedReport.documentId}
        index={selectedReport.index}
      />
    </>
  );
};

export default Overview;
