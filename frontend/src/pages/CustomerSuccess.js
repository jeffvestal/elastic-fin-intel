import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Autocomplete,
  Card,
  CardContent,
  Tabs,
  Tab,
  IconButton,
  Collapse,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Stack,
  alpha,
  CircularProgress,
  Button,
  Drawer,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import NotesIcon from '@mui/icons-material/Notes';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import MinimizeIcon from '@mui/icons-material/Minimize';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { usePageContext } from '../contexts/PageContextProvider';

const CustomerSuccess = () => {
  const { isDemoMode } = useDemoMode();
  const { showMCPTool, hideMCPTool } = useMCPNotification();
  const { setCurrentCustomer } = usePageContext();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatWidth, setChatWidth] = useState(400);
  const [chatHeight, setChatHeight] = useState(600);
  const [chatPosition, setChatPosition] = useState(
    () => localStorage.getItem('accountChatPosition') || 'bottom'
  );
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const isResizing = useRef(false);
  const isResizingVertical = useRef(false);

  // Real customer search using MCP tools
  const searchCustomers = async (query) => {
    if (query.length < 3) return [];
    
    // Show MCP tool notification
    const toolId = showMCPTool(
      'customer-success_searchcustomer-lookup', 
      'Searching for customers matching your query', 
      'ES Customer Success',
      { search_term: `*${query}*` }
    );
    
    try {
      const response = await fetch(`http://localhost:8000/customer/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.error('Customer search failed:', response.status);
        hideMCPTool(toolId, { error: `HTTP ${response.status}` }, 'error');
        return [];
      }
      
      const data = await response.json();
      
      // Check if the MCP tool returned an error
      if (data.error) {
        console.warn('MCP tool error:', data.error, data.details);
        hideMCPTool(toolId, { error: data.error }, 'error');
        return [];
      }
      
      // Success - hide the tool with result
      hideMCPTool(toolId, { customersFound: data.customers?.length || 0 }, 'completed');
      return data.customers || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      hideMCPTool(toolId, { error: error.message }, 'error');
      return [];
    }
  };

  // Fetch full customer details using MCP tools
  const fetchCustomerDetails = async (accountNumber) => {
    if (!accountNumber) return null;
    
    // Show MCP tool notifications for different data gathering operations
    const toolIds = {
      account: showMCPTool('customer-success_accountaccount-details', 'Getting account details', 'ES Customer Success', { account_number: accountNumber }),
      holdings: showMCPTool('customer-success_portfoliocurrent-holdings', 'Loading current holdings', 'ES Customer Success', { account_number: accountNumber }),
      trades: showMCPTool('customer-success_tradingrecent-trades', 'Fetching recent trades', 'ES Customer Success', { account_number: accountNumber, time_period: '30 days' })
    };
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/customer/${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        console.error('Failed to fetch customer details:', response.status);
        // Hide all tools with error
        Object.values(toolIds).forEach(id => hideMCPTool(id, { error: `HTTP ${response.status}` }, 'error'));
        return null;
      }
      
      const data = await response.json();
      
      // Hide tools with success based on what data was returned
      hideMCPTool(toolIds.account, { hasAccountDetails: !!data.account_details }, 'completed');
      hideMCPTool(toolIds.holdings, { holdingsCount: data.holdings?.length || 0 }, 'completed');
      hideMCPTool(toolIds.trades, { tradesCount: data.recent_trades?.length || 0 }, 'completed');
      
      return data;
    } catch (error) {
      console.error('Error fetching customer details:', error);
      // Hide all tools with error
      Object.values(toolIds).forEach(id => hideMCPTool(id, { error: error.message }, 'error'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = async (event, newValue) => {
    setSelectedCustomer(newValue);
    setCurrentCustomer(newValue); // Update page context
    if (newValue) {
      // Generate random notes for the customer
      const generatedNotes = generateCustomerNotes(newValue);
      setNotes(generatedNotes);
      
      const details = await fetchCustomerDetails(newValue.account);
      setCustomerData(details);
    } else {
      setCustomerData(null);
      setNotes('');
      setCurrentCustomer(null); // Clear page context
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(async () => {
      if (searchValue.length >= 3) {
        const results = await searchCustomers(searchValue);
        setSearchOptions(results);
      } else {
        setSearchOptions([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchValue]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Generate realistic customer notes
  const generateCustomerNotes = (customer) => {
    const templates = [
      {
        type: "Initial Call",
        content: "Initial consultation with {name}. Discussed investment goals and risk tolerance (level: {risk}). Customer interested in diversifying portfolio currently valued at {balance}. Scheduled follow-up to review specific investment options."
      },
      {
        type: "Follow-up",
        content: "Follow-up call with {name}. Reviewed portfolio performance - current balance {balance}. Customer pleased with {holdings} holdings diversity. Discussed potential rebalancing opportunities for next quarter."
      },
      {
        type: "Issue Resolution",
        content: "Addressed concerns from {name} regarding recent market volatility impact on portfolio. Explained risk management strategy for {risk} risk profile. Customer satisfied with explanation and account performance ({balance})."
      },
      {
        type: "Account Review",
        content: "Quarterly account review completed with {name}. Portfolio value now {balance} with {holdings} diversified holdings. Discussed tax implications and recommended adjustment strategies for upcoming year."
      },
      {
        type: "Upgrade Discussion",
        content: "Discussed premium service upgrade with {name}. Current account balance {balance} qualifies for enhanced advisory services. Customer considering options - will follow up next week to finalize decision."
      }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    const daysAgo = Math.floor(Math.random() * 45) + 5; // 5-50 days ago
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);

    const accountDetails = customer?.account_details || {};
    const balance = accountDetails.account_balance ? 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(accountDetails.account_balance) : 
      '$250,000';
    
    const holdingsCount = customer?.holdings?.length || Math.floor(Math.random() * 8) + 3;
    const riskLevel = accountDetails.risk_level || ['Conservative', 'Moderate', 'Aggressive'][Math.floor(Math.random() * 3)];

    let noteContent = template.content
      .replace(/{name}/g, customer.name || 'Customer')
      .replace(/{balance}/g, balance)
      .replace(/{risk}/g, riskLevel.toLowerCase())
      .replace(/{holdings}/g, holdingsCount);

    return `[${timestamp.toLocaleDateString()} - ${template.type}]\n${noteContent}\n\n--- Rep: ${['Sarah M.', 'David L.', 'Jennifer K.', 'Michael R.'][Math.floor(Math.random() * 4)]}`;
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Auto-expand when sending a message
    if (!chatExpanded) {
      setChatExpanded(true);
    }

    const notificationId = showMCPTool('Chat with Customer Context', 'Processing query with available tools');
    
    // Enhance the message with customer context
    const customerName = selectedCustomer?.name || 'Unknown Customer';
    const contextualMessage = `Customer Context: ${customerName}. Query: ${chatMessage}`;
    
    const userMessage = { 
      sender: 'user', 
      text: chatMessage, 
      timestamp: new Date().toLocaleTimeString() 
    };
    
    setChatMessages(prevMessages => [...prevMessages, userMessage]);
    setChatMessage('');
    setChatLoading(true);

    // Add a placeholder for the agent's message
    setChatMessages(prevMessages => [...prevMessages, { 
      sender: 'agent', 
      text: '', 
      timestamp: new Date().toLocaleTimeString() 
    }]);

    try {
      const response = await fetch('http://localhost:8000/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: contextualMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const fullText = await response.text();
      console.log('🔍 Customer Success Chat: Raw backend response:', fullText);

      // Update the last message with the response
      setChatMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].sender === 'agent') {
          newMessages[newMessages.length - 1].text = fullText;
        }
        return newMessages;
      });

    } catch (error) {
      console.error("Error fetching chat response:", error);
      const errorText = "Sorry, an error occurred while processing your request.";
      setChatMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].sender === 'agent') {
          newMessages[newMessages.length - 1].text = errorText;
        }
        return newMessages;
      });
    } finally {
      setChatLoading(false);
      hideMCPTool(notificationId);
    }
  };

  // Chat position and resize handlers
  const handlePositionChange = (event, newPosition) => {
    if (newPosition !== null) {
      setChatPosition(newPosition);
      localStorage.setItem('accountChatPosition', newPosition);
      
      // Auto-open right panel when switching to it
      if (newPosition === 'right') {
        setChatOpen(true);
      }
    }
  };

  const handleMouseDown = (e) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleVerticalMouseDown = (e) => {
    isResizingVertical.current = true;
    document.addEventListener('mousemove', handleVerticalMouseMove);
    document.addEventListener('mouseup', handleVerticalMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    setChatWidth(Math.max(300, Math.min(800, newWidth)));
  };

  const handleVerticalMouseMove = (e) => {
    if (!isResizingVertical.current) return;
    const newHeight = window.innerHeight - e.clientY;
    setChatHeight(Math.max(300, Math.min(window.innerHeight * 0.8, newHeight)));
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleVerticalMouseUp = () => {
    isResizingVertical.current = false;
    document.removeEventListener('mousemove', handleVerticalMouseMove);
    document.removeEventListener('mouseup', handleVerticalMouseUp);
  };

  // Chat expand/collapse handlers
  const handleChatExpand = () => {
    setChatExpanded(true);
  };

  const handleChatCollapse = () => {
    setChatExpanded(false);
  };

  const handleChatToggle = () => {
    setChatOpen(!chatOpen);
  };

  // Auto-expand on input focus
  const handleChatInputFocus = () => {
    if (!chatExpanded) {
      setChatExpanded(true);
    }
  };

  // Helper function to format currency
  const formatCurrency = (value) => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return value || 'N/A';
  };

  // Helper function to format percentage
  const formatPercentage = (value) => {
    if (typeof value === 'number') {
      const formatted = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
      return formatted;
    }
    return value || 'N/A';
  };

  // Helper function to get account details (handle array response)
  const getAccountDetails = () => {
    if (!customerData?.account_details) return {};
    return Array.isArray(customerData.account_details) 
      ? customerData.account_details[0] || {}
      : customerData.account_details;
  };

  // Helper function to calculate total account balance from holdings
  const calculateAccountBalance = () => {
    if (!customerData?.holdings || !Array.isArray(customerData.holdings)) return 0;
    return customerData.holdings.reduce((total, holding) => {
      return total + (holding.current_value || 0);
    }, 0);
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      gap: isDemoMode ? 3 : 2,
      p: isDemoMode ? 3 : 2,
      paddingBottom: selectedCustomer && chatPosition === 'bottom' ? '100px' : isDemoMode ? 24 : 16,
    }}>
      {/* Search Bar */}
      <Paper 
        elevation={2}
        sx={{ 
          p: isDemoMode ? 3 : 2,
          borderRadius: isDemoMode ? 3 : 2,
        }}
      >
        <Autocomplete
          fullWidth
          options={searchOptions}
          getOptionLabel={(option) => `${option.name} (${option.account})`}
          value={selectedCustomer}
          onChange={handleCustomerSelect}
          inputValue={searchValue}
          onInputChange={(event, newInputValue) => setSearchValue(newInputValue)}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for customer by name, account, or email (min 3 characters)..."
              variant="outlined"
              size={isDemoMode ? 'large' : 'medium'}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <Box key={key} {...otherProps} sx={{ p: 1 }}>
              <Stack spacing={0.5}>
                <Typography variant="body1" fontWeight={500}>
                  {option.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {option.account} • {option.email}
                </Typography>
              </Stack>
              </Box>
            );
          }}
          noOptionsText={
            searchValue.length < 3 ? 
              "Type at least 3 characters to search" : 
              "No customers found"
          }
        />
      </Paper>

      {loading && selectedCustomer && (
        <Box 
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={40} />
            <Typography variant="h6">Loading customer details...</Typography>
            <Typography variant="body2" color="text.secondary">
              Fetching data from MCP tools
            </Typography>
          </Stack>
        </Box>
      )}

      {selectedCustomer && customerData && !loading ? (
        <Grid container spacing={isDemoMode ? 3 : 2} sx={{ flexGrow: 1 }}>
          {/* Left Panel - Customer Info */}
          <Grid item xs={12} md={3}>
            <Card sx={{ height: 'fit-content', mb: isDemoMode ? 3 : 2 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {getAccountDetails().account_holder_name || selectedCustomer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getAccountDetails().account_id || selectedCustomer.account}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider />
                  
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Account Balance</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(calculateAccountBalance())}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Account Type</Typography>
                      <Typography variant="body2">{getAccountDetails().account_type || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Risk Level</Typography>
                      <Chip 
                        label="Moderate" 
                        size="small" 
                        color="warning" 
                        variant="outlined" 
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Chip 
                        label={customerData.account_details?.status || 'Active'} 
                        size="small" 
                        color={customerData.account_details?.status === 'Active' ? 'success' : 'default'} 
                        variant="outlined" 
                      />
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Center Panel - Holdings/Trades */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                  <Tab label="Holdings" />
                  <Tab label="Trade Activity" />
                </Tabs>

                {activeTab === 0 && (
                  <TableContainer sx={{ flexGrow: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Symbol</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Current Value</TableCell>
                          <TableCell align="right">Gain/Loss</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerData.holdings && Array.isArray(customerData.holdings) ? (
                          customerData.holdings.map((holding, index) => {
                            const gainLoss = holding.gain_loss || 0;
                            const gainLossPercent = holding.gain_loss_percent || 0;
                            const isPositive = gainLoss >= 0;
                            
                            return (
                              <TableRow key={`${holding.symbol}-${index}`}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {holding.symbol}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{holding.quantity || 0}</TableCell>
                                <TableCell align="right">{formatCurrency(holding.total_value)}</TableCell>
                                <TableCell align="right">
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                    {isPositive ? (
                                      <TrendingUpIcon sx={{ fontSize: '1rem', color: 'success.main' }} />
                                    ) : (
                                      <TrendingDownIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
                                    )}
                                    <Box sx={{ textAlign: 'right' }}>
                                      <Typography 
                                        variant="body2" 
                                        color={isPositive ? 'success.main' : 'error.main'}
                                      >
                                        {formatCurrency(gainLoss)}
                                      </Typography>
                                      <Typography 
                                        variant="caption" 
                                        color={isPositive ? 'success.main' : 'error.main'}
                                      >
                                        ({formatPercentage(gainLossPercent)})
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No holdings data available
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {activeTab === 1 && (
                  <TableContainer sx={{ flexGrow: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Action</TableCell>
                          <TableCell>Symbol</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerData.recent_trades && Array.isArray(customerData.recent_trades) ? (
                          customerData.recent_trades.map((trade, index) => {
                            const tradeValue = (trade.quantity || 0) * (trade.purchase_price || 0);
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  {trade.purchase_date ? new Date(trade.purchase_date).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label="BUY" 
                                    size="small" 
                                    color="success"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>{trade.symbol || 'N/A'}</TableCell>
                                <TableCell align="right">{trade.quantity || 0}</TableCell>
                                <TableCell align="right">{formatCurrency(trade.purchase_price)}</TableCell>
                                <TableCell align="right">{formatCurrency(tradeValue)}</TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No trade activity available
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Panel - Notes */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => setNotesExpanded(!notesExpanded)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotesIcon />
                    <Typography variant="h6">Notes</Typography>
                  </Box>
                  <IconButton size="small">
                    {notesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={notesExpanded}>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      variant="outlined"
                      placeholder="Add notes about this customer..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      size="small"
                    />
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Box 
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary'
          }}
        >
          <Stack spacing={2} alignItems="center">
            <SearchIcon sx={{ fontSize: '4rem', opacity: 0.3 }} />
            <Typography variant="h6">Search for a customer to get started</Typography>
            <Typography variant="body2" textAlign="center" sx={{ maxWidth: 400 }}>
              Use the search bar above to find customers by name, account number, or email address.
              You need to type at least 3 characters to begin searching.
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Account Chat Interface - Bottom Collapsible */}
      {selectedCustomer && chatPosition === 'bottom' && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: chatExpanded ? chatHeight : '80px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0px -8px 25px rgba(0, 0, 0, 0.4)',
            borderRadius: '12px 12px 0 0',
            overflow: 'hidden',
            zIndex: 1150,
            bgcolor: 'background.paper',
            transition: 'height 0.3s ease-in-out',
          }}
        >
          {/* Vertical resize handle - only when expanded */}
          {chatExpanded && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '10px',
                cursor: 'ns-resize',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
              onMouseDown={handleVerticalMouseDown}
            />
          )}
          
          {/* Header with controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: chatExpanded ? '1px solid #333' : 'none', mt: chatExpanded ? 1 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon color="primary" fontSize="small" />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                AI Assistant
              </Typography>
              <Chip 
                label={`${selectedCustomer.name}`} 
                size="small" 
                variant="outlined"
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleButtonGroup
                value={chatPosition}
                exclusive
                onChange={handlePositionChange}
                size="small"
              >
                <ToggleButton value="bottom">
                  <Tooltip title="Bottom Position">
                    <OpenInFullIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="right">
                  <Tooltip title="Right Side Panel">
                    <CallSplitIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
              {chatExpanded && (
                <IconButton onClick={handleChatCollapse} size="small">
                  <Tooltip title="Minimize">
                    <MinimizeIcon fontSize="small" />
                  </Tooltip>
                </IconButton>
              )}
            </Box>
          </Box>
          
          {/* Messages area - only when expanded */}
          {chatExpanded && (
            <Paper sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default', m: 1, borderRadius: 1 }}>
              {chatMessages.map((message, index) => (
                <Box key={index} sx={{ mb: 2, textAlign: message.sender === 'user' ? 'right' : 'left' }}>
                  <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                    {message.sender === 'user' ? 'You' : 'AI Assistant'} - {message.timestamp}
                  </Typography>
                  <Paper
                    sx={{
                      display: 'inline-block',
                      p: 1,
                      bgcolor: message.sender === 'user' ? 'primary.dark' : 'background.paper',
                      color: message.sender === 'user' ? 'white' : 'inherit',
                      borderRadius: '10px',
                      boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
                      maxWidth: '80%',
                      textAlign: 'left',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.text || (message.sender === 'agent' ? 'Thinking...' : '')}
                    </Typography>
                  </Paper>
                </Box>
              ))}
              {chatLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                  <Typography sx={{ ml: 1, color: 'text.secondary' }}>AI is thinking...</Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Paper>
          )}
          
          {/* Input area - always visible */}
          <Box component="form" onSubmit={handleChatSubmit} sx={{ display: 'flex', p: 1, borderTop: chatExpanded ? '1px solid #333' : 'none' }}>
            <TextField
              fullWidth
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onFocus={handleChatInputFocus}
              placeholder="Ask AI about this customer's account, holdings, or trades..."
              disabled={chatLoading}
              size="small"
            />
            <Button 
              type="submit"
              variant="contained"
              disabled={chatLoading || !chatMessage.trim()}
              sx={{ ml: 1, minWidth: '50px' }}
              size="small"
            >
              <SendIcon />
            </Button>
          </Box>
        </Paper>
      )}

      {/* Right side panel mode */}
      {selectedCustomer && chatPosition === 'right' && (
        <Drawer
          anchor="right"
          open={chatOpen}
          variant="persistent"
          PaperProps={{
            sx: {
              width: chatWidth,
              boxShadow: '0px 8px 25px rgba(0, 0, 0, 0.4)',
              borderRadius: '12px 0 0 12px',
              overflow: 'hidden',
            },
          }}
        >
          {/* Horizontal resize handle */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '10px',
              cursor: 'ew-resize',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
            onMouseDown={handleMouseDown}
          />
          
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with position toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #333' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ChatIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Assistant
                </Typography>
                <Chip 
                  label={`${selectedCustomer.name}`} 
                  size="small" 
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ToggleButtonGroup
                  value={chatPosition}
                  exclusive
                  onChange={handlePositionChange}
                  size="small"
                >
                  <ToggleButton value="bottom">
                    <Tooltip title="Bottom Position">
                      <OpenInFullIcon fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="right">
                    <Tooltip title="Right Side Panel">
                      <CallSplitIcon fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
                <IconButton onClick={handleChatToggle} size="small">
                  <Tooltip title="Close Panel">
                    <VisibilityOffIcon fontSize="small" />
                  </Tooltip>
                </IconButton>
              </Box>
            </Box>
            
            {/* Messages area */}
            <Paper sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default' }}>
              {chatMessages.map((message, index) => (
                <Box key={index} sx={{ mb: 2, textAlign: message.sender === 'user' ? 'right' : 'left' }}>
                  <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                    {message.sender === 'user' ? 'You' : 'AI Assistant'} - {message.timestamp}
                  </Typography>
                  <Paper
                    sx={{
                      display: 'inline-block',
                      p: 1,
                      bgcolor: message.sender === 'user' ? 'primary.dark' : 'background.paper',
                      color: message.sender === 'user' ? 'white' : 'inherit',
                      borderRadius: '10px',
                      boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
                      maxWidth: '80%',
                      textAlign: 'left',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.text || (message.sender === 'agent' ? 'Thinking...' : '')}
                    </Typography>
                  </Paper>
                </Box>
              ))}
              {chatLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                  <Typography sx={{ ml: 1, color: 'text.secondary' }}>AI is thinking...</Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Paper>
            
            {/* Input area */}
            <Box component="form" onSubmit={handleChatSubmit} sx={{ display: 'flex', p: 1, borderTop: '1px solid #333' }}>
              <TextField
                fullWidth
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask AI about this customer's account, holdings, or trades..."
                disabled={chatLoading}
              />
              <Button 
                type="submit"
                variant="contained"
                disabled={chatLoading || !chatMessage.trim()}
                sx={{ ml: 1, minWidth: '50px' }}
              >
                <SendIcon />
              </Button>
            </Box>
          </Box>
        </Drawer>
      )}

      {/* Floating Chat Toggle Button for Right Panel */}
      {selectedCustomer && chatPosition === 'right' && !chatOpen && (
        <IconButton
          onClick={handleChatToggle}
          sx={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 1300,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)',
          }}
          size="large"
        >
          <Tooltip title="Open Chat Panel">
            <ChatIcon />
          </Tooltip>
        </IconButton>
      )}
    </Box>
  );
};

export default CustomerSuccess;