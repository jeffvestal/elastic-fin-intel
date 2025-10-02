import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, CardContent, Grid, Typography, Modal, Box, TextField, List, ListItem, ListItemText, Collapse, CircularProgress, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { usePageContext } from '../contexts/PageContextProvider';
import EmailDraftPopup from '../components/EmailDraftPopup';
import axios from 'axios';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  maxHeight: '80vh',
  overflowY: 'auto',
};

const AccountDrilldown = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showMCPTool, hideMCPTool } = useMCPNotification();
  const { setCurrentAccount, setCurrentPath } = usePageContext();
  const [account, setAccount] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [articleContent, setArticleContent] = useState('');
  const [tradeHistory, setTradeHistory] = useState(null);
  const [tradeHistoryLoading, setTradeHistoryLoading] = useState(false);
  const [tradeHistoryError, setTradeHistoryError] = useState(null);
  const [symbolFilter, setSymbolFilter] = useState('');

  useEffect(() => {
    const fetchAccount = async () => {
      // Determine app mode based on current location
      const isCustomerSuccess = location.pathname.includes('/customer-success') || location.state?.fromAlerts;
      const appModeParam = isCustomerSuccess ? '?app_mode=customer-success' : '';
      
      const response = await axios.get(`http://localhost:8000/account/${accountId}${appModeParam}`);
      setAccount(response.data);
      
      // Set account context for chat
      setCurrentAccount({
        account_id: response.data.account_id,
        account_name: response.data.account_name,
        balance: response.data.holdings?.reduce((sum, holding) => sum + (holding.current_value || 0), 0) || 0,
        type: response.data.type,
        risk_profile: response.data.risk_profile,
        holdings: response.data.holdings || []
      });
    };
    fetchAccount();
    
    // Set current path for page context
    setCurrentPath(`/account/${accountId}`);
  }, [accountId, setCurrentAccount, setCurrentPath]);

  // Cleanup account context when component unmounts
  useEffect(() => {
    return () => {
      setCurrentAccount(null);
    };
  }, [setCurrentAccount]);

  useEffect(() => {
    const fetchTradeHistory = async () => {
      const notificationId = showMCPTool('utilities_tradingrecent-trades', 'Fetching recent trade history for account', 'Elastic Financial');

      setTradeHistoryLoading(true);
      setTradeHistoryError(null);
      try {
        // Determine app mode based on current location
        const isCustomerSuccess = location.pathname.includes('/customer-success') || location.state?.fromAlerts;
        const appModeParam = isCustomerSuccess ? '?app_mode=customer-success' : '';
        
        const response = await axios.get(`http://localhost:8000/account/${accountId}/trades${appModeParam}`);
        setTradeHistory(response.data);
      } catch (err) {
        console.error('Error fetching trade history:', err);
        setTradeHistoryError('Failed to load trade history');
      } finally {
        setTradeHistoryLoading(false);
        hideMCPTool(notificationId);
      }
    };

    if (accountId) {
      fetchTradeHistory();
    }
  }, [accountId]); // Removed showMCPTool, hideMCPTool from dependencies as they're stable

  const handleEmailModalOpen = async () => {
    setEmailModalOpen(true);
    setEmailLoading(true);
    setEmailError(null);
    setEmailData(null);
    
    const notificationId = showMCPTool('Email Generation', 'Analyzing account holdings and market developments for personalized email');
    
    try {
      const response = await axios.post('http://localhost:8000/email/draft', {
        account_id: accountId,
        time_period: 48,
        time_unit: 'hours'
      });
      setEmailData(response.data);
    } catch (error) {
      console.error('Error generating email:', error);
      
      let errorMessage = 'Failed to generate email. Please try again.';
      if (error.response?.data) {
        // Handle different error response formats
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : 'Invalid response format';
        } else if (error.response.data.message) {
          errorMessage = typeof error.response.data.message === 'string'
            ? error.response.data.message
            : 'Invalid response format';
        } else {
          // Handle validation errors or other complex objects safely
          try {
            errorMessage = `Server error: ${JSON.stringify(error.response.data)}`;
          } catch {
            errorMessage = 'Server returned an invalid error response';
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setEmailError(errorMessage);
    } finally {
      setEmailLoading(false);
      hideMCPTool(notificationId);
    }
  };

  const handleEmailModalClose = () => {
    setEmailModalOpen(false);
    setEmailData(null);
    setEmailError(null);
  };

  const handleArticleOpen = async (articleId, type) => {
    try {
      const endpoint = type === 'news' ? `/article/${articleId}` : `/report/${articleId}`;
      const response = await axios.get(`http://localhost:8000${endpoint}`);
      setArticleContent(response.data.content);
      setArticleModalOpen(true);
    } catch (error) {
      console.error("Error fetching article/report content:", error);
      setArticleContent("Could not load content.");
      setArticleModalOpen(true);
    }
  };

  const handleArticleClose = () => {
    setArticleModalOpen(false);
    setArticleContent('');
  };

  const handleBackNavigation = () => {
    // Check if we came from alerts page and preserve state
    const fromAlerts = location.state?.fromAlerts;
    if (fromAlerts) {
      navigate('/alerts', {
        state: {
          preserveState: true,
          alertsData: location.state.alertsData,
          timePeriod: location.state.timePeriod,
          timeUnit: location.state.timeUnit,
          expandedAlerts: location.state.expandedAlerts
        }
      });
    } else {
      // Default to accounts page
      navigate('/accounts');
    }
  };


  if (!account) return <div>Loading...</div>;

  // Calculate total account balance from holdings
  const totalBalance = account.holdings?.reduce((sum, holding) => {
    return sum + (holding.current_value || 0);
  }, 0) || 0;

  // Filter holdings and trades based on symbol filter
  const filteredHoldings = account.holdings?.filter(holding => 
    holding.symbol?.toLowerCase().includes(symbolFilter.toLowerCase())
  ) || [];

  const filteredTrades = tradeHistory?.trades?.filter(trade => 
    trade.symbol?.toLowerCase().includes(symbolFilter.toLowerCase())
  ) || [];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackNavigation}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
        </Box>
        <Typography variant="h4">{account.account_name}</Typography>
      </Grid>
      
      {/* Account Summary Card */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Account ID
                  </Typography>
                  <Typography variant="h6">
                    {account.account_id || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Account Balance
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    ${totalBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Account Type
                  </Typography>
                  <Typography variant="h6">
                    {account.type || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Risk Level
                  </Typography>
                  <Typography variant="h6">
                    {account.risk_profile || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Status
                  </Typography>
                  <Typography variant="h6">
                    {account.state || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button variant="contained" onClick={handleEmailModalOpen}>Draft Email</Button>
          <TextField
            label="Filter by Symbol"
            variant="outlined"
            size="small"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: symbolFilter && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSymbolFilter('')}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
            placeholder="e.g. AAPL, CORP_BOND_ENG_I"
          />
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Holdings</Typography>
            {filteredHoldings?.map((holding, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper'
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {holding.symbol}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Shares
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {holding.quantity?.toLocaleString()}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Current Value
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" color="success.main">
                      ${holding.current_value?.toLocaleString()}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Purchase Price
                    </Typography>
                    <Typography variant="body1">
                      ${holding.purchase_price?.toFixed(2)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Gain/Loss
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="medium"
                      color={holding.gain_loss >= 0 ? "success.main" : "error.main"}
                    >
                      ${holding.gain_loss?.toLocaleString()} ({holding.gain_loss_percent?.toFixed(2)}%)
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            ))}
            {(!filteredHoldings || filteredHoldings.length === 0) && (
              <Typography variant="body2" color="textSecondary">
                Holdings data not available for this account.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Trade History</Typography>

            {tradeHistoryLoading && (
              <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading trade history...
                </Typography>
              </Box>
            )}

            {tradeHistoryError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {tradeHistoryError}
              </Alert>
            )}

            {tradeHistory && (!tradeHistory.trades || tradeHistory.trades.length === 0) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  No Trades Found
                </Typography>
                <Typography variant="body2">
                  No trades found for this account.
                </Typography>
              </Alert>
            )}

            {filteredTrades && filteredTrades.length > 0 && (
              <>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Found {filteredTrades.length} trades
                  </Typography>
                </Box>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Symbol</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell align="right"><strong>Quantity</strong></TableCell>
                        <TableCell align="right"><strong>Execution Price</strong></TableCell>
                        <TableCell align="right"><strong>Trade Cost</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTrades.map((trade, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Chip 
                              label={trade.symbol} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {trade.execution_timestamp ? new Date(trade.execution_timestamp).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            {trade.quantity?.toLocaleString() || 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            ${typeof trade.execution_price === 'number' ? 
                              trade.execution_price.toFixed(2) : 
                              'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            ${typeof trade.trade_cost === 'number' ? 
                              trade.trade_cost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 
                              'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {(!filteredTrades || filteredTrades.length === 0) && !tradeHistoryLoading && !tradeHistoryError && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  No Trades Found
                </Typography>
                <Typography variant="body2">
                  {symbolFilter ? `No trades found matching "${symbolFilter}"` : 'No trades found for this account.'}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
      <EmailDraftPopup
        open={emailModalOpen}
        onClose={handleEmailModalClose}
        emailData={emailData}
        loading={emailLoading}
        error={emailError}
      />

      <Modal
        open={articleModalOpen}
        onClose={handleArticleClose}
      >
        <Box sx={modalStyle}>
          <Typography variant="h6">Article/Report Content</Typography>
          <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{articleContent}</Typography>
          <Button onClick={handleArticleClose} sx={{ mt: 2 }}>Close</Button>
        </Box>
      </Modal>
    </Grid>
  );
};

export default AccountDrilldown;
