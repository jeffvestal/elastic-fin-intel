import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

import Header from './components/Header';
import MCPToolNotification from './components/MCPToolNotification';
import MCPToolBanner from './components/MCPToolBanner';
import MCPExecutionPanel from './components/MCPExecutionPanel';
import AnimatedRoutes from './components/AnimatedRoutes';
import GlobalStyles from './styles/GlobalStyles';
import Chat from './pages/Chat';
import { MCPNotificationProvider } from './contexts/MCPNotificationContext';
import { DemoModeProvider, useDemoMode } from './contexts/DemoModeContext';
import { MCPDisplaySettingsProvider, useMCPDisplaySettings } from './contexts/MCPDisplaySettingsContext';

const getDesignTokens = (mode, isDemoMode = false) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Professional light mode palette
          primary: {
            main: '#0F4C81', // Deep navy blue
            light: '#4A7BA7',
            dark: '#073A63',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#10B981', // Emerald green for financial success
            light: '#34D399',
            dark: '#047857',
            contrastText: '#ffffff',
          },
          error: {
            main: '#EF4444', // Modern red
            light: '#F87171',
            dark: '#DC2626',
          },
          warning: {
            main: '#F59E0B', // Amber
            light: '#FBBF24',
            dark: '#D97706',
          },
          info: {
            main: '#3B82F6', // Blue
            light: '#60A5FA',
            dark: '#2563EB',
          },
          success: {
            main: '#10B981', // Emerald
            light: '#34D399',
            dark: '#059669',
          },
          background: {
            default: '#F8FAFC', // Slate 50
            paper: '#FFFFFF',
            surface: '#F1F5F9', // Slate 100
          },
          text: {
            primary: '#0F172A', // Slate 900
            secondary: '#475569', // Slate 600
            disabled: '#94A3B8', // Slate 400
          },
          divider: '#E2E8F0', // Slate 200
          grey: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          },
        }
      : {
          // Professional dark mode palette
          primary: {
            main: '#3B82F6', // Bright blue for dark mode
            light: '#60A5FA',
            dark: '#2563EB',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#10B981', // Emerald green
            light: '#34D399',
            dark: '#047857',
            contrastText: '#ffffff',
          },
          error: {
            main: '#EF4444',
            light: '#F87171',
            dark: '#DC2626',
          },
          warning: {
            main: '#F59E0B',
            light: '#FBBF24',
            dark: '#D97706',
          },
          info: {
            main: '#06B6D4',
            light: '#22D3EE',
            dark: '#0891B2',
          },
          success: {
            main: '#10B981',
            light: '#34D399',
            dark: '#059669',
          },
          background: {
            default: '#0F172A', // Slate 900
            paper: '#1E293B', // Slate 800
            surface: '#334155', // Slate 700
          },
          text: {
            primary: '#F8FAFC', // Slate 50
            secondary: '#CBD5E1', // Slate 300
            disabled: '#64748B', // Slate 500
          },
          divider: '#334155', // Slate 700
          grey: {
            50: '#0F172A',
            100: '#1E293B',
            200: '#334155',
            300: '#475569',
            400: '#64748B',
            500: '#94A3B8',
            600: '#CBD5E1',
            700: '#E2E8F0',
            800: '#F1F5F9',
            900: '#F8FAFC',
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: isDemoMode ? 16 : 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: { 
      fontSize: isDemoMode ? '3rem' : '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
    },
    h2: { 
      fontSize: isDemoMode ? '2.5rem' : '2rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1.3,
    },
    h3: { 
      fontSize: isDemoMode ? '2rem' : '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h4: { 
      fontSize: isDemoMode ? '1.75rem' : '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h5: { 
      fontSize: isDemoMode ? '1.5rem' : '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h6: { 
      fontSize: isDemoMode ? '1.25rem' : '1.1rem',
      fontWeight: 600,
      letterSpacing: '-0.005em',
      lineHeight: 1.4,
    },
    body1: { 
      fontSize: isDemoMode ? '1.1rem' : '1rem',
      lineHeight: 1.6,
      letterSpacing: '0.00938em',
    },
    body2: { 
      fontSize: isDemoMode ? '1rem' : '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.00714em',
    },
    subtitle1: {
      fontSize: isDemoMode ? '1.125rem' : '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: isDemoMode ? '1rem' : '0.875rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    caption: {
      fontSize: isDemoMode ? '0.875rem' : '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: '0.03333em',
    },
    overline: {
      fontSize: isDemoMode ? '0.875rem' : '0.75rem',
      fontWeight: 500,
      lineHeight: 2,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    },
    button: { 
      fontSize: isDemoMode ? '1rem' : '0.875rem',
      fontWeight: isDemoMode ? 600 : 500,
      textTransform: 'none', // Remove uppercase transform
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: isDemoMode ? 12 : 8,
  },
  spacing: 8, // 8px grid system
  // Professional shadow system
  shadows: [
    'none',
    '0px 1px 3px rgba(15, 23, 42, 0.08), 0px 1px 2px rgba(15, 23, 42, 0.12)', // xs
    '0px 1px 3px rgba(15, 23, 42, 0.08), 0px 4px 6px rgba(15, 23, 42, 0.12)', // sm
    '0px 4px 6px rgba(15, 23, 42, 0.05), 0px 10px 15px rgba(15, 23, 42, 0.12)', // md
    '0px 10px 15px rgba(15, 23, 42, 0.05), 0px 20px 25px rgba(15, 23, 42, 0.12)', // lg
    '0px 25px 50px rgba(15, 23, 42, 0.15)', // xl
    '0px 25px 50px rgba(15, 23, 42, 0.25)', // 2xl
    ...Array(19).fill('0px 25px 50px rgba(15, 23, 42, 0.25)'), // Fill remaining
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontSize: isDemoMode ? '16px' : '14px',
          fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '*': {
          boxSizing: 'border-box',
        },
        '*:focus-visible': {
          outline: '2px solid #3B82F6',
          outlineOffset: '2px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: isDemoMode ? 16 : 12,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[2],
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
          },
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: isDemoMode ? '24px' : '20px',
          '&:last-child': {
            paddingBottom: isDemoMode ? '24px' : '20px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: isDemoMode ? 12 : 8,
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: '0.02em',
          padding: isDemoMode ? '12px 24px' : '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: theme.shadows[2],
          },
        }),
        contained: ({ theme }) => ({
          boxShadow: theme.shadows[1],
          '&:hover': {
            boxShadow: theme.shadows[3],
            transform: 'translateY(-1px)',
          },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: isDemoMode ? 16 : 12,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[2],
          backdropFilter: 'blur(8px)',
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 0,
          boxShadow: theme.shadows[1],
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: isDemoMode ? '72px' : '64px',
          paddingLeft: isDemoMode ? '32px' : '24px',
          paddingRight: isDemoMode ? '32px' : '24px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: isDemoMode ? 8 : 6,
          fontWeight: 500,
          border: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: isDemoMode ? 12 : 8,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: isDemoMode ? 12 : 8,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            transform: 'scale(1.05)',
          },
        }),
      },
    },
    MuiTypography: {
      styleOverrides: {
        h1: {
          fontWeight: 700,
          letterSpacing: '-0.025em',
        },
        h2: {
          fontWeight: 600,
          letterSpacing: '-0.025em',
        },
        h3: {
          fontWeight: 600,
          letterSpacing: '-0.02em',
        },
        h4: {
          fontWeight: 600,
          letterSpacing: '-0.01em',
        },
        h5: {
          fontWeight: 600,
          letterSpacing: '-0.01em',
        },
        h6: {
          fontWeight: 600,
          letterSpacing: '-0.005em',
        },
      },
    },
    MuiGrid: {
      styleOverrides: {
        root: {
          '--Grid-borderWidth': '1px',
          '& > .MuiGrid-item': {
            paddingTop: isDemoMode ? '16px' : '12px',
            paddingLeft: isDemoMode ? '16px' : '12px',
          },
        },
      },
    },
  },
});

function App() {
  const [mode, setMode] = useState('dark');
  const [chatOpen, setChatOpen] = useState(false);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  // Create an inner component that has access to demo mode and MCP display settings context
  const AppContent = () => {
    const { isDemoMode } = useDemoMode();
    const { showBanner, showFloating, bannerPosition, displayMode } = useMCPDisplaySettings();
    const theme = useMemo(() => createTheme(getDesignTokens(mode, isDemoMode)), [isDemoMode]);
    
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header toggleChat={toggleChat} toggleColorMode={colorMode.toggleColorMode} currentMode={mode} />
            
            {/* MCP Tools Banner - Top Position */}
            {showBanner && bannerPosition === 'top' && <MCPToolBanner />}
            
            <Box 
              component="main" 
              sx={{ 
                flexGrow: 1, 
                p: isDemoMode ? 4 : 3,
                transition: 'all 0.3s ease'
              }}
            >
              <AnimatedRoutes />
            </Box>
            
            {/* MCP Tools Banner - Bottom Position */}
            {showBanner && bannerPosition === 'bottom' && <MCPToolBanner />}
            
            <Chat open={chatOpen} toggleChat={toggleChat} />
          </Box>
          
          {/* Floating MCP Tools Notification */}
          {showFloating ? <MCPToolNotification key={`floating-${showFloating}-${displayMode}`} /> : null}
          
          {/* Demo Mode MCP Execution Panel (legacy) - Disabled to prevent duplication with modern MCP tools display */}
          {/* {isDemoMode && <MCPExecutionPanel />} */}
        </Router>
      </ThemeProvider>
    );
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  return (
    <DemoModeProvider>
      <MCPNotificationProvider>
        <MCPDisplaySettingsProvider>
          <AppContent />
        </MCPDisplaySettingsProvider>
      </MCPNotificationProvider>
    </DemoModeProvider>
  );
}

export default App;
