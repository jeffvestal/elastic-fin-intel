import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton,
  Avatar,
  Chip,
  Stack,
  alpha,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArticleIcon from '@mui/icons-material/Article';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAppMode } from '../contexts/AppModeContext';
import { usePageContext } from '../contexts/PageContextProvider';

const Header = ({ toggleColorMode, currentMode }) => {
  const location = useLocation();
  const { isDemoMode } = useDemoMode();
  const { appMode, isPortfolioMode, isCustomerSuccessMode, toggleAppMode } = useAppMode();
  const { globalChatOpen, setGlobalChatOpen } = usePageContext();

  const portfolioNavItems = [
    { path: '/', label: 'Overview', icon: <DashboardIcon /> },
    { path: '/alerts', label: 'Alerts', icon: <TrendingDownIcon /> },
    { path: '/accounts', label: 'Accounts', icon: <AccountBalanceIcon /> },
    { path: '/news', label: 'News', icon: <ArticleIcon /> },
    { path: '/reports', label: 'Reports', icon: <AssessmentIcon /> },
  ];

  const customerSuccessNavItems = [
    { path: '/customer-success', label: 'Customer Search', icon: <SupportAgentIcon /> },
  ];

  const navItems = isPortfolioMode ? portfolioNavItems : customerSuccessNavItems;

  const isActiveRoute = (path) => {
    if (isCustomerSuccessMode && path === '/customer-success') {
      return location.pathname === '/customer-success';
    }
    return location.pathname === path;
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        backgroundColor: (theme) => theme.palette.mode === 'dark' 
          ? alpha(theme.palette.background.paper, 0.8)
          : alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(20px)',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ 
        minHeight: isDemoMode ? 80 : 72,
        px: isDemoMode ? 4 : 3,
      }}>
        {/* Logo and Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Avatar
            sx={{
              width: isDemoMode ? 44 : 40,
              height: isDemoMode ? 44 : 40,
              mr: 2,
              background: 'linear-gradient(135deg, #0F4C81 0%, #10B981 100%)',
              fontSize: isDemoMode ? '1.2rem' : '1rem',
              fontWeight: 700,
            }}
          >
            E
          </Avatar>
          <Box>
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                fontSize: isDemoMode ? '1.5rem' : '1.25rem',
                letterSpacing: '-0.02em',
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #F8FAFC 0%, #CBD5E1 100%)'
                  : 'linear-gradient(135deg, #0F4C81 0%, #10B981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {isPortfolioMode ? 'Elastic Fin-Intel' : 'Elastic Customer Success'}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {isDemoMode && (
                <Chip 
                  label="Demo Mode" 
                  size="small" 
                  color="secondary"
                  sx={{ 
                    fontSize: '0.7rem',
                    height: 18,
                  }}
                />
              )}
              <Chip 
                label={isPortfolioMode ? 'Portfolio Manager' : 'Customer Success'} 
                size="small" 
                color="primary"
                variant="outlined"
                sx={{ 
                  fontSize: '0.7rem',
                  height: 18,
                }}
              />
            </Stack>
          </Box>
        </Box>

        {/* Navigation */}
        <Stack direction="row" spacing={1} alignItems="center">
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              startIcon={item.icon}
              variant={isActiveRoute(item.path) ? 'contained' : 'text'}
              size={isDemoMode ? 'large' : 'medium'}
              sx={{
                fontWeight: 500,
                px: isDemoMode ? 3 : 2,
                py: isDemoMode ? 1 : 0.5,
                borderRadius: isDemoMode ? 12 : 8,
                textTransform: 'none',
                color: isActiveRoute(item.path) 
                  ? undefined 
                  : (theme) => theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              {item.label}
            </Button>
          ))}
          
          {/* Chat Button */}
          <Button
            onClick={() => setGlobalChatOpen(!globalChatOpen)}
            startIcon={<ChatBubbleOutlineIcon />}
            variant="outlined"
            size={isDemoMode ? 'large' : 'medium'}
            sx={{
              fontWeight: 500,
              px: isDemoMode ? 3 : 2,
              py: isDemoMode ? 1 : 0.5,
              borderRadius: isDemoMode ? 12 : 8,
              textTransform: 'none',
              borderColor: (theme) => globalChatOpen ? theme.palette.primary.main : theme.palette.divider,
              backgroundColor: (theme) => globalChatOpen ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              '&:hover': {
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                borderColor: (theme) => theme.palette.primary.main,
              },
            }}
          >
            Chat
          </Button>

          {/* App Mode Switcher */}
          <FormControlLabel
            control={
              <Switch
                checked={isCustomerSuccessMode}
                onChange={toggleAppMode}
                size={isDemoMode ? 'medium' : 'small'}
                sx={{
                  '& .MuiSwitch-switchBase': {
                    '&.Mui-checked': {
                      color: (theme) => theme.palette.secondary.main,
                      '& + .MuiSwitch-track': {
                        backgroundColor: (theme) => theme.palette.secondary.main,
                      },
                    },
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DashboardIcon sx={{ fontSize: '1rem' }} />
                <Typography variant="caption" sx={{ fontSize: isDemoMode ? '0.75rem' : '0.7rem' }}>
                  {isPortfolioMode ? 'Portfolio' : 'Customer'}
                </Typography>
              </Box>
            }
            labelPlacement="start"
            sx={{ 
              mr: 2,
              '& .MuiFormControlLabel-label': {
                fontSize: isDemoMode ? '0.875rem' : '0.75rem',
              }
            }}
          />

          {/* Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, gap: 1 }}>
            <IconButton 
              onClick={toggleColorMode} 
              size={isDemoMode ? 'large' : 'medium'}
              sx={{
                color: (theme) => theme.palette.text.primary,
                backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.5),
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.8),
                  transform: 'scale(1.05)',
                },
              }}
            >
              {currentMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            
            <IconButton 
              component={Link} 
              to="/settings"
              size={isDemoMode ? 'large' : 'medium'}
              sx={{
                color: (theme) => theme.palette.text.primary,
                backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.5),
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.8),
                  transform: 'scale(1.05)',
                },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
