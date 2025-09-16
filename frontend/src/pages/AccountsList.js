import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Box,
  Chip,
  Container,
  Grid,
  InputAdornment,
  IconButton,
  Skeleton,
  useTheme,
  Autocomplete
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { motion, AnimatePresence } from 'framer-motion';
import MetricCard from '../components/MetricCard';
import MiniChart from '../components/MiniChart';
import PageTransition from '../components/PageTransition';
import { useMCPNotification } from '../contexts/MCPNotificationContext';
import { useAppMode } from '../contexts/AppModeContext';
import axios from 'axios';

const AccountsList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'total_portfolio_value', direction: 'desc' });
  const navigate = useNavigate();
  const theme = useTheme();
  const { showMCPTool, hideMCPTool } = useMCPNotification();
  const { appMode } = useAppMode();

  useEffect(() => {
    fetchAccounts();
  }, []);

  // MCP account search functionality
  const searchAccounts = async (query) => {
    if (query.length < 3) return [];
    
    // Show MCP tool notification - adjust tool name based on app mode
    const toolName = appMode === 'portfolio' ? 'utilities_search_customer-lookup' : 'customer-success_searchcustomer-lookup';
    const serverName = appMode === 'portfolio' ? 'Elastic Financial Assistant' : 'Elastic Customer Success';
    
    const toolId = showMCPTool(
      toolName, 
      'Searching for accounts matching your query', 
      serverName,
      { search_term: query }
    );
    
    try {
      // Add app_mode parameter to the search request
      const url = `http://localhost:8000/account/search?q=${encodeURIComponent(query)}${appMode ? `&app_mode=${appMode}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Account search failed:', response.status);
        hideMCPTool(toolId, { error: `HTTP ${response.status}` }, 'error');
        return [];
      }
      
      const data = await response.json();
      
      // Check if the MCP tool returned an error
      if (data.error) {
        console.warn('MCP tool error:', data.error);
        hideMCPTool(toolId, { error: data.error }, 'error');
        return [];
      }
      
      // Success - hide the tool with result
      hideMCPTool(toolId, { accountsFound: data.accounts?.length || 0 }, 'completed');
      return data.accounts || [];
    } catch (error) {
      console.error('Error searching accounts:', error);
      hideMCPTool(toolId, { error: error.message }, 'error');
      return [];
    }
  };

  // Handle account selection from autocomplete
  const handleAccountSelect = (event, newValue) => {
    setSelectedAccount(newValue);
    if (newValue) {
      // Navigate to the selected account
      handleAccountClick(newValue.account_id);
    }
  };

  // Debounced search for autocomplete
  useEffect(() => {
    const delayedSearch = setTimeout(async () => {
      if (searchTerm.length >= 3) {
        const results = await searchAccounts(searchTerm);
        setSearchOptions(results);
      } else {
        setSearchOptions([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/accounts');
      setAccounts(response.data.accounts);
    } catch (err) {
      console.log('Backend not available - accounts page will show empty state for MCP demo');
      setAccounts([]); // Empty state for MCP demo
      setError(null); // Don't show error for demo
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const handleAccountClick = (accountId) => {
    navigate(`/account/${accountId}`);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const filteredAndSortedAccounts = React.useMemo(() => {
    let filtered = accounts.filter(account =>
      account.account_holder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }
      });
    }

    return filtered;
  }, [accounts, searchTerm, sortConfig]);

  const renderSkeleton = () => (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="30%" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="60%" height={30} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 2 }} />
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[...Array(4)].map((_, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="80%" height={30} />
                <Skeleton variant="text" width="60%" height={40} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
    </Container>
  );

  if (loading) {
    return renderSkeleton();
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const totalValue = accounts.reduce((sum, acc) => sum + (acc.total_portfolio_value || 0), 0);
  const avgValue = accounts.length > 0 ? totalValue / accounts.length : 0;
  const topPerformer = accounts.reduce((top, acc) => 
    acc.total_portfolio_value > (top?.total_portfolio_value || 0) ? acc : top, null);

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedAccount(null);
    setSearchOptions([]);
  };

  return (
    <PageTransition>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ mb: 4 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Box
                sx={{
                  p: 1.5,
                  mr: 2,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AccountBalanceIcon sx={{ fontSize: '2rem' }} />
              </Box>
              <Box>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent'
                  }}
                >
                  Client Accounts
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Comprehensive portfolio management dashboard
                </Typography>
              </Box>
            </Box>

            {/* Search with MCP Auto-complete */}
            <Autocomplete
              fullWidth
              options={searchOptions}
              value={selectedAccount}
              onChange={handleAccountSelect}
              inputValue={searchTerm}
              onInputChange={(event, newInputValue) => {
                setSearchTerm(newInputValue);
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return `${option.account_holder_name} (${option.account_id}) - ${option.state}`;
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}
                    >
                      {option.account_holder_name?.charAt(0) || 'A'}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="600">
                        {option.account_holder_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.account_id} • {option.state} • {formatCurrency(option.total_portfolio_value)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search accounts by name, ID, or state... (type 3+ characters)"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {searchTerm && (
                          <InputAdornment position="end">
                            <IconButton onClick={handleClearSearch} edge="end" size="small">
                              <ClearIcon />
                            </IconButton>
                          </InputAdornment>
                        )}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                    sx: {
                      backgroundColor: theme.palette.background.paper,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.04),
                      },
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: theme.shadows[2],
                      },
                      '&.Mui-focused': {
                        boxShadow: theme.shadows[4],
                      },
                    },
                  }}
                />
              )}
              noOptionsText={
                searchTerm.length >= 3 
                  ? "No accounts found matching your search" 
                  : "Type 3 or more characters to search accounts"
              }
              loading={searchTerm.length >= 3 && searchOptions.length === 0}
              loadingText="Searching accounts..."
            />
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Accounts"
              value={accounts.length}
              subtitle="Active portfolios"
              icon={<GroupIcon />}
              trend={accounts.length > 0 ? 'up' : null}
              trendValue="+12%"
              gradient={[theme.palette.primary.main, theme.palette.primary.light]}
              delay={0.1}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total AUM"
              value={totalValue}
              subtitle="Assets under management"
              icon={<AttachMoneyIcon />}
              trend="up"
              trendValue="+8.4%"
              gradient={[theme.palette.success.main, theme.palette.success.light]}
              delay={0.2}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Average Portfolio"
              value={avgValue}
              subtitle="Per account"
              icon={<TrendingUpIcon />}
              trend="up"
              trendValue="+5.2%"
              gradient={[theme.palette.info.main, theme.palette.info.light]}
              delay={0.3}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Top Performer"
              value={topPerformer?.total_portfolio_value || 0}
              subtitle={topPerformer?.account_holder_name || 'No data'}
              icon={<AccountBalanceIcon />}
              trend="up"
              trendValue="+15.7%"
              gradient={[theme.palette.warning.main, theme.palette.warning.light]}
              delay={0.4}
            />
          </Grid>
        </Grid>

        {/* Professional Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card
            sx={{
              overflow: 'hidden',
              boxShadow: theme.shadows[4],
              '&:hover': {
                boxShadow: theme.shadows[8],
              },
              transition: 'box-shadow 0.3s ease-in-out'
            }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow
                    sx={{
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      <TableSortLabel
                        active={sortConfig.key === 'account_id'}
                        direction={sortConfig.key === 'account_id' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('account_id')}
                      >
                        Account ID
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      <TableSortLabel
                        active={sortConfig.key === 'account_holder_name'}
                        direction={sortConfig.key === 'account_holder_name' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('account_holder_name')}
                      >
                        Account Holder
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      <TableSortLabel
                        active={sortConfig.key === 'state'}
                        direction={sortConfig.key === 'state' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('state')}
                      >
                        Location
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      <TableSortLabel
                        active={sortConfig.key === 'total_portfolio_value'}
                        direction={sortConfig.key === 'total_portfolio_value' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('total_portfolio_value')}
                      >
                        Portfolio Value
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      Performance
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {filteredAndSortedAccounts.map((account, index) => (
                      <motion.tr
                        key={account.account_id}
                        component={TableRow}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        hover
                        onClick={() => handleAccountClick(account.account_id)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.04),
                            transform: 'scale(1.01)',
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{
                              fontWeight: 500,
                              color: theme.palette.text.secondary
                            }}
                          >
                            {account.account_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                              }}
                            >
                              {account.account_holder_name?.charAt(0) || 'A'}
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight="600">
                                {account.account_holder_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Client since 2020
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={account.state}
                            size="small"
                            sx={{
                              backgroundColor: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.main,
                              fontWeight: 500,
                              borderRadius: 2
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="700"
                            sx={{
                              color: theme.palette.success.main,
                              fontSize: '1rem'
                            }}
                          >
                            {formatCurrency(account.total_portfolio_value)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            +5.4% this month
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: 80, height: 30 }}>
                            <MiniChart
                              type="line"
                              color={theme.palette.success.main}
                              height={30}
                            />
                          </Box>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </motion.div>

        {/* Empty State */}
        {filteredAndSortedAccounts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ mt: 4, textAlign: 'center', py: 8 }}>
              <CardContent>
                <AccountBalanceIcon
                  sx={{
                    fontSize: '4rem',
                    color: theme.palette.action.disabled,
                    mb: 2
                  }}
                />
                <Typography variant="h5" gutterBottom color="text.secondary">
                  {searchTerm ? `No accounts found matching "${searchTerm}"` : 'No accounts available'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {searchTerm
                    ? 'Try adjusting your search criteria or clear the search to see all accounts.'
                    : 'This page will show account data when connected to Elasticsearch via MCP tools.'}
                </Typography>
                {searchTerm && (
                  <Box sx={{ mt: 3 }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClearSearch}
                      style={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Clear Search
                    </motion.button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </Container>
    </PageTransition>
  );
};

export default AccountsList;