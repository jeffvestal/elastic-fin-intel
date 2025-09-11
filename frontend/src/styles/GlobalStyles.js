import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const GlobalStyles = () => (
  <MuiGlobalStyles
    styles={(theme) => ({
      '@import': [
        'url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap")',
        'url("https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700&display=swap")',
      ],
      
      // Scrollbar styling
      '*::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '*::-webkit-scrollbar-track': {
        background: theme.palette.grey[100],
        borderRadius: '4px',
      },
      '*::-webkit-scrollbar-thumb': {
        background: theme.palette.grey[300],
        borderRadius: '4px',
        '&:hover': {
          background: theme.palette.grey[400],
        },
      },
      
      // Selection styling
      '::selection': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      },
      
      // Custom animations
      '@keyframes fadeIn': {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      
      '@keyframes slideUp': {
        from: { 
          opacity: 0,
          transform: 'translateY(20px)',
        },
        to: { 
          opacity: 1,
          transform: 'translateY(0)',
        },
      },
      
      '@keyframes pulse': {
        '0%, 100%': {
          opacity: 1,
        },
        '50%': {
          opacity: 0.5,
        },
      },
      
      '@keyframes shimmer': {
        '0%': {
          backgroundPosition: '-200% 0',
        },
        '100%': {
          backgroundPosition: '200% 0',
        },
      },
      
      // Loading skeleton animation
      '.skeleton': {
        background: `linear-gradient(90deg, ${theme.palette.grey[200]} 25%, ${theme.palette.grey[100]} 50%, ${theme.palette.grey[200]} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
        borderRadius: theme.shape.borderRadius,
      },
      
      // Fade in animation class
      '.fade-in': {
        animation: 'fadeIn 0.6s ease-out',
      },
      
      // Slide up animation class
      '.slide-up': {
        animation: 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // Hover lift effect
      '.hover-lift': {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      },
      
      // Glass effect
      '.glass': {
        background: theme.palette.mode === 'dark' 
          ? 'rgba(30, 41, 59, 0.8)' 
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: `1px solid ${theme.palette.divider}`,
      },
      
      // Focus ring
      '.focus-ring': {
        outline: 'none',
        boxShadow: `0 0 0 3px ${theme.palette.primary.main}40`,
      },
      
      // Gradient backgrounds
      '.gradient-primary': {
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      },
      
      '.gradient-secondary': {
        background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
      },
      
      '.gradient-success': {
        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
      },
      
      '.gradient-error': {
        background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
      },
      
      // Status badges
      '.status-positive': {
        color: theme.palette.success.main,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(16, 185, 129, 0.1)',
        border: `1px solid ${theme.palette.success.main}20`,
      },
      
      '.status-negative': {
        color: theme.palette.error.main,
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.1)'
          : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${theme.palette.error.main}20`,
      },
      
      '.status-neutral': {
        color: theme.palette.text.secondary,
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(100, 116, 139, 0.1)'
          : 'rgba(100, 116, 139, 0.1)',
        border: `1px solid ${theme.palette.grey[300]}`,
      },
      
      // Professional shadows
      '.shadow-card': {
        boxShadow: theme.shadows[2],
      },
      
      '.shadow-elevated': {
        boxShadow: theme.shadows[4],
      },
      
      '.shadow-floating': {
        boxShadow: theme.shadows[6],
      },
      
      // Text utilities
      '.text-gradient': {
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      },
      
      // Layout utilities
      '.full-height': {
        height: '100vh',
      },
      
      '.center-content': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      
      // Interactive elements
      '.interactive': {
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'scale(1.02)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      },
      
      // Number animations
      '.count-up': {
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
      },
    })}
  />
);

export default GlobalStyles;